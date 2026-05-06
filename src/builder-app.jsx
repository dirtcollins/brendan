function App() {
  const { session, authLoading, passwordRecovery, setPasswordRecovery } = useAuthSession();

  if (!supabaseClient) {
    return <AuthShell title="Supabase is not configured" message="Add your Supabase URL and publishable key in src/supabase-config.js." />;
  }

  if (authLoading) {
    return <AuthShell title="Loading" message="Checking your saved login session." />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (passwordRecovery) {
    return <UpdatePasswordScreen onComplete={() => setPasswordRecovery(false)} />;
  }

  return <BuilderApp session={session} />;
}

function BuilderApp({ session }) {
  const isAdmin = ADMIN_EMAILS.includes((session.user.email || "").toLowerCase());
  const [settings, setSettings] = useSavedSettings();
  const {
    builds: savedBuilds,
    setBuilds: setSavedBuilds,
    loading: projectsLoading,
    error: projectsError,
    refresh: refreshProjects
  } = useSupabaseProjects(session.user.id);
  const {
    requests: featureRequests,
    setRequests: setFeatureRequests,
    loading: requestsLoading,
    error: requestsError,
    refresh: refreshFeatureRequests
  } = useSupabaseFeatureRequests(session.user.id, isAdmin);
  const [currentBuildId, setCurrentBuildId] = useState("");
  const [buildName, setBuildName] = useState("");
  const [activeTab, setActiveTab] = useState("materials");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [gateZoom, setGateZoom] = useState(100);
  const [fenceZoom, setFenceZoom] = useState(100);
  const [gateViewMode, setGateViewMode] = useState("2d");
  const [fenceViewMode, setFenceViewMode] = useState("2d");
  const [gatePreviewPosition, setGatePreviewPosition] = useState({ left: null, top: null });
  const [fencePreviewPosition, setFencePreviewPosition] = useState({ left: null, top: null });
  const savedGateBuilds = useMemo(() => savedBuilds.filter((build) => normalizeSettings(build.settings).buildMode === "gate"), [savedBuilds]);
  const personalFeatureRequests = useMemo(() => featureRequests.filter((request) => request.userId === session.user.id), [featureRequests, session.user.id]);
  const visibleFeatureRequests = isAdmin ? featureRequests : personalFeatureRequests;
  const linkedFenceGateBuild = useMemo(() => (
    savedGateBuilds.find((build) => build.id === settings.fenceGateBuildId) || null
  ), [savedGateBuilds, settings.fenceGateBuildId]);
  const linkedFenceGateSettings = linkedFenceGateBuild ? normalizeSettings(linkedFenceGateBuild.settings) : null;
  const gateCalc = useMemo(() => calculate(settings), [settings]);
  const fenceCalc = useMemo(() => calculateFence(settings, linkedFenceGateSettings), [settings, linkedFenceGateSettings]);
  const isFence = settings.buildMode === "fence";
  const calc = isFence ? fenceCalc : gateCalc;
  const messages = useMemo(() => (
    isFence ? getFenceMessages(settings, fenceCalc) : getMessages(settings, gateCalc)
  ), [settings, isFence, gateCalc, fenceCalc]);
  const materialRows = useMemo(() => (
    isFence ? getFenceMaterialRows(settings, fenceCalc) : getMaterialRows(settings, gateCalc)
  ), [settings, isFence, gateCalc, fenceCalc]);
  const cutRows = useMemo(() => (
    isFence ? getFenceCutRows(settings, fenceCalc) : getCutRows(settings, gateCalc)
  ), [settings, isFence, gateCalc, fenceCalc]);

  useEffect(() => {
    if (settings.manualPicketSpacing) return;

    setSettings((current) => {
      const balanced = balancePicketsForSettings(current);
      if (
        balanced.leftPicketCount === current.leftPicketCount
        && balanced.rightPicketCount === current.rightPicketCount
      ) {
        return current;
      }
      return balanced;
    });
  }, [
    settings.leftLeafWidth,
    settings.rightLeafWidth,
    settings.gateType,
    settings.frameSize,
    settings.picketWidth,
    settings.layoutMode,
    settings.leftPicketCount,
    settings.rightPicketCount,
    settings.manualPicketSpacing,
    setSettings
  ]);

  function updateField(id, value) {
    setSettings((current) => {
      const textFields = new Set(["buildMode", "gateType", "hingePostSide", "fenceSectionMode", "fenceManualSections", "fencePicketMaterial", "fenceGateBuildId"]);
      if (textFields.has(id)) return { ...current, [id]: value };
      const wholeFields = new Set(["leftPicketCount", "rightPicketCount", "railCount", "fenceGateCount", "fenceRailCount"]);
      const rebalanceFields = new Set(["leftLeafWidth", "rightLeafWidth", "frameSize", "picketWidth"]);
      const unit = numberFieldUnit(id);
      const rawValue = typeof value === "string" && unit ? parseMeasurementInput(value, unit) : Number(value);
      const parsed = wholeFields.has(id) ? Math.max(0, Math.round(Number(value) || 0)) : rawValue;
      const nextValue = Number.isNaN(parsed) ? 0 : parsed;
      let next = { ...current, [id]: nextValue };
      if (id === "leftLeafWidth" && current.sameLeafWidth) {
        next = { ...next, rightLeafWidth: nextValue };
      }
      return rebalanceFields.has(id) && !current.manualPicketSpacing ? balancePicketsForSettings(next) : next;
    });
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULTS);
    setCurrentBuildId("");
    setBuildName("");
  }

  async function saveBuild() {
    const cleanName = buildName.trim() || `${isFence ? "Fence" : "Gate"} Build ${savedBuilds.length + 1}`;
    const projectData = normalizeSettings(settings);
    setSaveStatus("Saving");
    if (currentBuildId && savedBuilds.some((build) => build.id === currentBuildId)) {
      const { error } = await supabaseClient
        .from("projects")
        .update({ name: cleanName, type: isFence ? "fence" : "gate", data: projectData })
        .eq("id", currentBuildId);
      if (error) {
        setSaveStatus(`Save failed: ${error.message}`);
        return;
      }
      await refreshProjects();
      setBuildName(cleanName);
      setSaveStatus("Saved");
      return;
    }

    const { data, error } = await supabaseClient
      .from("projects")
      .insert({ user_id: session.user.id, name: cleanName, type: isFence ? "fence" : "gate", data: projectData })
      .select("id, name, type, data, created_at")
      .single();
    if (error) {
      setSaveStatus(`Save failed: ${error.message}`);
      return;
    }
    setSavedBuilds((current) => [projectRowToBuild(data), ...current]);
    setCurrentBuildId(data.id);
    setBuildName(cleanName);
    setSaveStatus("Saved");
  }

  async function saveBuildAsNew() {
    const cleanName = buildName.trim() || `${isFence ? "Fence" : "Gate"} Build ${savedBuilds.length + 1}`;
    setSaveStatus("Saving");
    const { data, error } = await supabaseClient
      .from("projects")
      .insert({ user_id: session.user.id, name: cleanName, type: isFence ? "fence" : "gate", data: normalizeSettings(settings) })
      .select("id, name, type, data, created_at")
      .single();
    if (error) {
      setSaveStatus(`Save failed: ${error.message}`);
      return;
    }
    setSavedBuilds((current) => [projectRowToBuild(data), ...current]);
    setCurrentBuildId(data.id);
    setBuildName(cleanName);
    setSaveStatus("Saved");
  }

  function loadBuild(build) {
    setSettings(normalizeSettings(build.settings));
    setCurrentBuildId(build.id);
    setBuildName(build.name);
  }

  function loadBuildById(id) {
    const build = savedBuilds.find((item) => item.id === id);
    if (build) loadBuild(build);
  }

  async function deleteBuild(id) {
    const { error } = await supabaseClient.from("projects").delete().eq("id", id);
    if (error) {
      setSaveStatus(`Delete failed: ${error.message}`);
      return;
    }
    setSavedBuilds((current) => current.filter((build) => build.id !== id));
    if (id === currentBuildId) {
      setCurrentBuildId("");
      setBuildName("");
    }
  }

  async function duplicateBuild(build) {
    const buildSettings = normalizeSettings(build.settings);
    const name = `${build.name} Copy`;
    setSaveStatus("Saving");
    const { data, error } = await supabaseClient
      .from("projects")
      .insert({ user_id: session.user.id, name, type: buildSettings.buildMode === "fence" ? "fence" : "gate", data: buildSettings })
      .select("id, name, type, data, created_at")
      .single();
    if (error) {
      setSaveStatus(`Duplicate failed: ${error.message}`);
      return;
    }
    setSavedBuilds((current) => [projectRowToBuild(data), ...current]);
    setSaveStatus("Saved");
  }

  function exportMaterials() {
    if (isFence) {
      downloadCSV("fence-materials.csv", [
        ["Item", "Qty", "Material", "Length", "Wall Thickness", "Notes"],
        ...materialRows,
        ["Post stock to buy", fenceCalc.stockPlans[0].best.sticks, tubeSpec(settings.postWidth, settings.postThickness), feet(fenceCalc.stockPlans[0].best.stockLength, 0), thicknessLabel(settings.postThickness), `${feet(fenceCalc.purchasedLength, 2)} purchased, ${feet(fenceCalc.stockWaste, 2)} leftover`]
      ]);
      return;
    }
    downloadCSV("gate-materials.csv", [
      ["Item", "Qty", "Material", "Length", "Wall Thickness", "Notes"],
      ...materialRows,
      ...calc.stockPlans.map((plan) => [
        `${plan.name} stock to buy`,
        plan.best.sticks,
        tubeSpec(plan.size, plan.thickness),
        feet(plan.best.stockLength, 0),
        thicknessLabel(plan.thickness),
        `${feet(plan.best.purchased, 2)} purchased, ${feet(plan.best.used, 2)} used, ${feet(plan.best.waste, 2)} leftover`
      ]),
      ["Gate weight", 1, pounds(calc.totalGateWeight, 1), "", "", calc.doubleGate ? `Left ${pounds(calc.leftGateWeight, 1)}, right ${pounds(calc.rightGateWeight, 1)}; posts excluded` : "Single gate leaf; posts excluded"],
      ["Total steel weight to buy", "", pounds(calc.totalMetalWeight, 1), "", "", `${feet(calc.purchasedLength, 2)} purchased, ${feet(calc.stockWaste, 2)} leftover`],
      ["Estimated metal cost", "", money(calc.metalCost), "", "", `${money(settings.cwtCost)} per CWT`]
    ]);
  }

  function exportCuts() {
    downloadCSV(`${isFence ? "fence" : "gate"}-cut-list.csv`, [["#", "Part", "Qty", "Length", "Width", "Wall Thickness", "Stock Needed", "Type", "Notes"], ...cutRows]);
  }

  function exportPdfPacket() {
    generateFabricationPacketPdf({
      settings,
      calc,
      isFence,
      materialRows,
      cutRows,
      buildName: buildName.trim()
    });
  }

  async function addFeatureRequest(request) {
    const payload = {
      user_id: session.user.id,
      title: request.title,
      details: request.details,
      priority: request.priority,
      status: "New",
      build_type: settings.buildMode,
      build_name: buildName.trim()
    };
    const { data, error } = await supabaseClient
      .from("feature_requests")
      .insert(payload)
      .select("id, user_id, title, details, priority, status, build_type, build_name, created_at")
      .single();
    if (error) throw error;
    setFeatureRequests((current) => [featureRowToRequest(data), ...current]);
  }

  async function deleteFeatureRequest(id) {
    const { error } = await supabaseClient.from("feature_requests").delete().eq("id", id);
    if (error) throw error;
    setFeatureRequests((current) => current.filter((request) => request.id !== id));
  }

function exportFeatureRequests() {
    const rows = isAdmin ? featureRequests : personalFeatureRequests;
    downloadCSV("feature-requests.csv", [
      ["Title", "Priority", "Status", "Build Type", "Build Name", "Details", "Created", "User ID"],
      ...rows.map((request) => [
        request.title,
        request.priority,
        request.status,
        request.buildMode,
        request.buildName,
        request.details,
        formatDateTime(request.createdAt),
        request.userId
      ])
    ]);
  }


  const panelViews = {
    saved: { icon: "saved", title: "Saved Builds" },
    requests: { icon: "request", title: "Feature Requests" },
    settings: { icon: "settings", title: "Settings" }
  };
  const panelView = panelViews[activeTab];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="mark">
            <img src="./src/assets/logo4.svg" alt="Fence & Gate Builder" />
          </div>
          <div>
            <h1>Fence & Gate Builder</h1>
            <div className="subtitle">Fabrication layout, materials, and cut lists</div>
          </div>
        </div>
        <div className="actions">
          <label className="build-name-field">
            <span>Build name</span>
            <input
              type="text"
              value={buildName}
              placeholder="Customer or build name"
              onChange={(event) => setBuildName(event.target.value)}
            />
          </label>
          <button className="btn primary top-action-save" onClick={saveBuild}><Icon name="save" />Save Build</button>
          <button className="btn new-build top-action-new" onClick={saveBuildAsNew}><Icon name="plus" />New Build</button>
          <button className="btn top-action-export" onClick={exportPdfPacket}><Icon name="upload" />Export PDF</button>
          <button
            className="btn more-actions-toggle"
            type="button"
            aria-expanded={moreMenuOpen}
            onClick={() => setMoreMenuOpen((open) => !open)}
          >
            More
          </button>
          <div className={`secondary-actions ${moreMenuOpen ? "open" : ""}`}>
            <label className="open-build-field">
              <span>Open build</span>
              <select
                value={currentBuildId}
                onChange={(event) => {
                  loadBuildById(event.target.value);
                  setMoreMenuOpen(false);
                }}
                disabled={savedBuilds.length === 0}
              >
                <option value="">{savedBuilds.length === 0 ? "No saved builds" : "Choose saved build"}</option>
                {savedBuilds
                  .slice()
                  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                  .map((build) => (
                    <option key={build.id} value={build.id}>{build.name}</option>
                  ))}
              </select>
            </label>
            <button className="btn" onClick={() => { reset(); setMoreMenuOpen(false); }}><Icon name="reset" />Reset</button>
            <button className="btn" onClick={() => { window.print(); setMoreMenuOpen(false); }}><Icon name="print" />Print</button>
            <button className="btn" onClick={() => supabaseClient.auth.signOut()}>Logout</button>
          </div>
        </div>
      </header>

      <PrimaryNav
        buildMode={settings.buildMode}
        activeTab={activeTab}
        onBuildMode={(mode) => {
          updateField("buildMode", mode);
          if (panelViews[activeTab]) setActiveTab("materials");
        }}
        onView={setActiveTab}
      />
      {isFence ? <FenceSummary settings={settings} calc={fenceCalc} /> : <Summary settings={settings} calc={gateCalc} />}

      <div className="workspace">
        {isFence
          ? <FenceControls settings={settings} updateField={updateField} setSettings={setSettings} messages={messages} savedGateBuilds={savedGateBuilds} />
          : <Controls settings={settings} calc={gateCalc} updateField={updateField} setSettings={setSettings} messages={messages} />}
        <main className="main">
          {isFence
            ? <FenceDrawing settings={settings} calc={fenceCalc} setSettings={setSettings} linkedGateBuild={linkedFenceGateBuild} zoom={fenceZoom} setZoom={setFenceZoom} viewMode={fenceViewMode} setViewMode={setFenceViewMode} previewPosition={fencePreviewPosition} setPreviewPosition={setFencePreviewPosition} />
            : <Drawing settings={settings} calc={gateCalc} zoom={gateZoom} setZoom={setGateZoom} viewMode={gateViewMode} setViewMode={setGateViewMode} previewPosition={gatePreviewPosition} setPreviewPosition={setGatePreviewPosition} />}
          <section className="panel">
            {panelView ? (
              <div className="panel-titlebar">
                <Icon name={panelView.icon} />
                <strong>{panelView.title}</strong>
              </div>
            ) : (
              <div className="tabs" role="tablist">
                {[
                  ["materials", "Materials"],
                  ["purchase", "Purchase"],
                  ["cutlist", "Cut List"],
                  ["notes", "Build Notes"]
                ].map(([id, label]) => (
                  <button
                    className={`tab ${activeTab === id ? "active" : ""}`}
                    key={id}
                    onClick={() => setActiveTab(id)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="panel-body">
              {activeTab === "materials" && (isFence ? <FenceMaterials settings={settings} calc={fenceCalc} rows={materialRows} /> : <Materials settings={settings} calc={gateCalc} rows={materialRows} />)}
              {activeTab === "purchase" && (isFence ? <FencePurchase settings={settings} calc={fenceCalc} /> : <Purchase settings={settings} calc={gateCalc} />)}
              {activeTab === "cutlist" && <CutList rows={cutRows} />}
              {activeTab === "saved" && (
                <SavedBuilds
                  builds={savedBuilds}
                  currentBuildId={currentBuildId}
                  onLoad={loadBuild}
                  onDuplicate={duplicateBuild}
                  onDelete={deleteBuild}
                  loading={projectsLoading}
                  error={projectsError}
                />
              )}
              {activeTab === "settings" && <SettingsPanel settings={settings} updateField={updateField} />}
              {activeTab === "requests" && (
                <FeatureRequests
                  requests={visibleFeatureRequests}
                  onAdd={addFeatureRequest}
                  onDelete={deleteFeatureRequest}
                  loading={requestsLoading}
                  error={requestsError}
                  ownerMode={isAdmin}
                />
              )}
              {activeTab === "notes" && (isFence ? <FenceBuildNotes settings={settings} calc={fenceCalc} /> : <BuildNotes settings={settings} calc={gateCalc} />)}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PrimaryNav({ buildMode, activeTab, onBuildMode, onView }) {
  const items = [
    { id: "gate", label: "Gate", icon: "gate", type: "mode" },
    { id: "fence", label: "Fence", icon: "fence", type: "mode" },
    { id: "requests", label: "Requests", icon: "request", type: "view" },
    { id: "settings", label: "Settings", icon: "settings", type: "view" },
    { id: "saved", label: "Builds", icon: "builds", type: "view" }
  ];

  return (
    <section className="mode-switch" aria-label="Primary navigation">
      {items.map((item) => {
        const active = item.type === "mode"
          ? !["saved", "requests", "settings"].includes(activeTab) && buildMode === item.id
          : activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mode-button ${active ? "active" : ""}`}
            aria-label={item.label}
            title={item.label}
            onClick={() => (item.type === "mode" ? onBuildMode(item.id) : onView(item.id))}
          >
            <Icon name={item.icon} />
            <span className="mode-label">{item.label}</span>
          </button>
        );
      })}
    </section>
  );
}

function Summary({ settings, calc }) {
  return (
    <section className="summary" aria-label="Gate summary">
      <Metric label="Gate Type" value={calc.doubleGate ? "Double" : "Single"} />
      <Metric label="Total Outside" value={inch(calc.outside, 2)} />
      <Metric label="Post Opening" value={inch(calc.opening, 2)} />
      <Metric label={calc.doubleGate ? "Left Width" : "Gate Width"} value={inch(settings.leftLeafWidth, 2)} />
      {calc.doubleGate && <Metric label="Right Width" value={inch(settings.rightLeafWidth, 2)} />}
      <Metric label="Picket Gaps" value={calc.picketGap >= 0 ? (calc.doubleGate ? `${inch(calc.leftPicketGap, 2)} / ${inch(calc.rightPicketGap, 2)}` : inch(calc.leftPicketGap, 2)) : "ERR"} />
      <Metric label="Total Pickets" value={calc.totalPickets} />
      <Metric label="Frame Tube" value={feet(calc.frameTubeWithWaste, 2)} />
      <Metric label={calc.doubleGate ? "Left Gate" : "Gate Weight"} value={pounds(calc.leftGateWeight, 1)} />
      {calc.doubleGate && <Metric label="Right Gate" value={pounds(calc.rightGateWeight, 1)} />}
      {calc.doubleGate && <Metric label="Both Gates" value={pounds(calc.totalGateWeight, 1)} />}
      <Metric label="Buy Weight" value={pounds(calc.totalMetalWeight, 1)} />
      <Metric label="Metal Cost" value={money(calc.metalCost)} />
    </section>
  );
}

function FenceSummary({ settings, calc }) {
  return (
    <section className="summary" aria-label="Fence summary">
      <Metric label="Fence Length" value={feet(calc.totalLength, 2)} />
      <Metric label="Fence Sections" value={calc.sections.length} />
      <Metric label="Longest Section" value={feet(calc.longestSection, 2)} />
      <Metric label="Max Section" value={feet(calc.maxSection, 0)} />
      <Metric label="Gates" value={`${calc.gateCount} x ${feet(calc.gateWidth, 2)}`} />
      <Metric label="Posts" value={calc.totalPostCount} />
      <Metric label="Post Cut" value={inch(calc.postCutLength, 2)} />
      <Metric label="Pickets" value={calc.totalPickets} />
      <Metric label="Picket Type" value={settings.fencePicketMaterial} />
      <Metric label="Picket Width" value={inchFraction(settings.fencePicketWidth)} />
      <Metric label="Post Weight" value={pounds(calc.totalMetalWeight, 1)} />
      <Metric label="Post Cost" value={money(calc.metalCost)} />
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Controls({ settings, calc, updateField, setSettings, messages }) {
  const doubleGate = isDoubleGate(settings);

  function balancePicketSpacing() {
    setSettings((current) => balancePicketsForSettings({ ...current, manualPicketSpacing: false }));
  }

  function toggleManualPicketSpacing(checked) {
    setSettings((current) => (
      checked
        ? { ...current, manualPicketSpacing: true }
        : balancePicketsForSettings({ ...current, manualPicketSpacing: false })
    ));
  }

  function toggleSameLeafWidth(checked) {
    setSettings((current) => {
      const next = {
        ...current,
        sameLeafWidth: checked,
        rightLeafWidth: checked ? current.leftLeafWidth : current.rightLeafWidth
      };
      return current.manualPicketSpacing ? next : balancePicketsForSettings(next);
    });
  }

  return (
    <aside className="sidebar">
      <section className="section">
        <SectionTitle icon="ruler">Opening</SectionTitle>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="gateType">Gate type</label>
            <select id="gateType" value={settings.gateType} onChange={(event) => updateField("gateType", event.target.value)}>
              <option value="double">Double gate</option>
              <option value="single">Single gate</option>
            </select>
          </div>
          <NumberField id="postWidth" label="Post width" value={settings.postWidth} onChange={updateField} />
          <ThicknessField id="postThickness" label="Post wall thickness" value={settings.postThickness} onChange={updateField} />
          <NumberField id="postHeight" label="Post above ground" value={settings.postHeight} onChange={updateField} min="1" />
          <NumberField id="postEmbed" label="Post in ground" value={settings.postEmbed} onChange={updateField} min="0" />
          <NumberField id="leftLeafWidth" label={doubleGate ? "Left gate width" : "Gate width"} value={settings.leftLeafWidth} onChange={updateField} min="1" />
          {doubleGate && <NumberField id="rightLeafWidth" label="Right gate width" value={settings.rightLeafWidth} onChange={updateField} min="1" disabled={settings.sameLeafWidth} />}
          {doubleGate && (
            <label className="check-field full" htmlFor="sameLeafWidth">
              <input
                id="sameLeafWidth"
                type="checkbox"
                checked={settings.sameLeafWidth}
                onChange={(event) => toggleSameLeafWidth(event.target.checked)}
              />
              <span>Both gates are the same width</span>
            </label>
          )}
          <NumberField id="leafHeight" label="Gate leaf height" value={settings.leafHeight} onChange={updateField} min="1" />
          {doubleGate ? (
            <>
              <NumberField id="postGap" label="Post-to-gate gap" value={settings.postGap} onChange={updateField} />
              <NumberField id="centerGap" label="Center gap" value={settings.centerGap} onChange={updateField} />
            </>
          ) : (
            <>
              <div className="field full">
                <label htmlFor="hingePostSide">Hinge post side</label>
                <select id="hingePostSide" value={settings.hingePostSide} onChange={(event) => updateField("hingePostSide", event.target.value)}>
                  <option value="left">Left post is hinge post</option>
                  <option value="right">Right post is hinge post</option>
                </select>
              </div>
              <NumberField id="hingeGap" label="Hinge post gap" value={settings.hingeGap} onChange={updateField} />
              <NumberField id="latchGap" label="Latch post gap" value={settings.latchGap} onChange={updateField} />
            </>
          )}
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="frame">Frame & Pickets</SectionTitle>
        <div className="form-grid">
          <NumberField id="frameSize" label="Frame tube size" value={settings.frameSize} onChange={updateField} min="0.125" />
          <ThicknessField id="frameThickness" label="Frame wall thickness" value={settings.frameThickness} onChange={updateField} />
          <NumberField id="picketWidth" label="Picket width" value={settings.picketWidth} onChange={updateField} min="0.125" />
          <ThicknessField id="picketThickness" label="Picket wall thickness" value={settings.picketThickness} onChange={updateField} />
          <div className="picket-spacing-panel full">
            <label className="picket-override-row" htmlFor="manualPicketSpacing">
              <input
                id="manualPicketSpacing"
                type="checkbox"
                checked={settings.manualPicketSpacing}
                onChange={(event) => toggleManualPicketSpacing(event.target.checked)}
              />
              <span>Override picket spacing</span>
            </label>

            <div className={`picket-count-grid ${doubleGate ? "two" : "one"}`}>
              <NumberField
                id="leftPicketCount"
                label={doubleGate ? "Left pickets" : "Pickets"}
                value={settings.leftPicketCount}
                onChange={updateField}
                min="1"
                max="40"
                step="1"
                disabled={!settings.manualPicketSpacing}
                showSteppers
              />
              {doubleGate && (
                <NumberField
                  id="rightPicketCount"
                  label="Right pickets"
                  value={settings.rightPicketCount}
                  onChange={updateField}
                  min="1"
                  max="40"
                  step="1"
                  disabled={!settings.manualPicketSpacing}
                  showSteppers
                />
              )}
            </div>

            <div className="picket-spacing-readout">
              <span>Picket spacing</span>
              {doubleGate ? (
                <strong className="spacing-values">
                  <span>Left {inch(Math.max(calc.leftPicketGap, 0), 3)}</span>
                  <span>Right {inch(Math.max(calc.rightPicketGap, 0), 3)}</span>
                </strong>
              ) : (
                <strong>{inch(Math.max(calc.leftPicketGap, 0), 3)}</strong>
              )}
            </div>

            <button className="btn balance-spacing-btn" type="button" onClick={balancePicketSpacing}>Balance spacing</button>
          </div>
          <NumberField id="railCount" label="Horizontal rails per leaf" value={settings.railCount} onChange={updateField} min="2" max="6" step="1" />
          <div className="field full">
            <label htmlFor="layoutMode">Picket layout</label>
            <select
              id="layoutMode"
              value={settings.layoutMode}
              onChange={(event) => setSettings((current) => {
                const next = { ...current, layoutMode: event.target.value };
                return current.manualPicketSpacing ? next : balancePicketsForSettings(next);
              })}
            >
              <option value="auto">Auto space between frame sides</option>
              <option value="edge">First and last picket touch frame</option>
            </select>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="dollar">Steel Cost</SectionTitle>
        <div className="form-grid">
          <NumberField id="cwtCost" label="Cost per CWT" value={settings.cwtCost} onChange={updateField} min="0" step="1" full />
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="chart">Results</SectionTitle>
        <div className="status">
          {messages.map((message) => (
            <div className={`message ${message.type}`} key={message.text}>{message.text}</div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function FenceControls({ settings, updateField, setSettings, messages, savedGateBuilds }) {
  const selectedGateBuild = savedGateBuilds.find((build) => build.id === settings.fenceGateBuildId) || null;
  const selectedGateCalc = selectedGateBuild ? calculate(normalizeSettings(selectedGateBuild.settings)) : null;

  function chooseGateBuild(id) {
    const build = savedGateBuilds.find((item) => item.id === id);
    if (!build) {
      setSettings((current) => ({
        ...current,
        fenceGateBuildId: "",
        fenceGateCount: 0
      }));
      return;
    }
    const gateSettings = normalizeSettings(build.settings);
    const gateCalc = calculate(gateSettings);
    setSettings((current) => ({
      ...current,
      fenceGateBuildId: id,
      fenceGateCount: 1,
      fenceGateWidthFeet: Number((gateCalc.outside / 12).toFixed(2))
    }));
  }

  return (
    <aside className="sidebar">
      <section className="section">
        <SectionTitle icon="ruler">Fence Run</SectionTitle>
        <div className="form-grid">
          <NumberField id="fenceLengthFeet" label="Total fence length (ft)" value={settings.fenceLengthFeet} onChange={updateField} min="1" step="0.25" />
          <NumberField id="fenceMaxSectionFeet" label="Max section length (ft)" value={settings.fenceMaxSectionFeet} onChange={updateField} min="1" step="0.25" />
          <NumberField id="fenceHeight" label="Fence height" value={settings.fenceHeight} onChange={updateField} min="1" />
          <NumberField id="fencePostEmbed" label="Posts in ground" value={settings.fencePostEmbed} onChange={updateField} min="0" />
          <div className="field full">
            <label htmlFor="fenceSectionMode">Section sizing</label>
            <select id="fenceSectionMode" value={settings.fenceSectionMode} onChange={(event) => updateField("fenceSectionMode", event.target.value)}>
              <option value="auto">Even sections under max length</option>
              <option value="manual">Manual section sizes</option>
            </select>
          </div>
          <label className="field full" htmlFor="fenceManualSections">
            <span>Manual section sizes (ft)</span>
            <input
              id="fenceManualSections"
              type="text"
              value={settings.fenceManualSections}
              placeholder="Example: 7.5, 7.5, 8, 6"
              disabled={settings.fenceSectionMode !== "manual"}
              onChange={(event) => updateField("fenceManualSections", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="wood">Pickets</SectionTitle>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="fencePicketMaterial">Wood</label>
            <select id="fencePicketMaterial" value={settings.fencePicketMaterial} onChange={(event) => updateField("fencePicketMaterial", event.target.value)}>
              <option value="Cedar">Cedar</option>
              <option value="Redwood">Redwood</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fencePicketWidth">Picket width</label>
            <select id="fencePicketWidth" value={String(settings.fencePicketWidth)} onChange={(event) => updateField("fencePicketWidth", event.target.value)}>
              <option value="3.5">3-1/2"</option>
              <option value="5.5">5-1/2"</option>
            </select>
          </div>
          <NumberField id="fencePicketHeight" label="Picket height" value={settings.fencePicketHeight} onChange={updateField} min="1" />
          <NumberField id="fenceRailCount" label="Rails per section" value={settings.fenceRailCount} onChange={updateField} min="2" max="4" step="1" />
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="link">Gates In Fence</SectionTitle>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="fenceGateBuildId">Saved gate build</label>
            <select id="fenceGateBuildId" value={settings.fenceGateBuildId} onChange={(event) => chooseGateBuild(event.target.value)}>
              <option value="">No saved gate selected</option>
              {savedGateBuilds.map((build) => {
                const gateCalc = calculate(normalizeSettings(build.settings));
                return <option key={build.id} value={build.id}>{build.name} - {feet(gateCalc.outside, 2)} outside / {feet(gateCalc.opening, 2)} opening</option>;
              })}
            </select>
          </div>
          <NumberField id="fenceGateCount" label="Gate openings" value={settings.fenceGateBuildId ? 1 : settings.fenceGateCount} onChange={updateField} min="0" max="20" step="1" disabled={Boolean(settings.fenceGateBuildId)} />
          <NumberField id="fenceGateWidthFeet" label="Gate space width (ft)" value={selectedGateCalc ? Number((selectedGateCalc.outside / 12).toFixed(2)) : settings.fenceGateWidthFeet} onChange={updateField} min="0" step="0.25" disabled={Boolean(settings.fenceGateBuildId)} />
          <NumberField id="fenceGateStartFeet" label="Gate starts from left (ft)" value={settings.fenceGateStartFeet} onChange={updateField} min="0" step="0.25" full />
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="posts">PostMaster Cost</SectionTitle>
        <div className="form-grid">
          <NumberField id="postWidth" label="Post width" value={settings.postWidth} onChange={updateField} />
          <ThicknessField id="postThickness" label="Post wall thickness" value={settings.postThickness} onChange={updateField} />
          <NumberField id="cwtCost" label="Metal cost per CWT" value={settings.cwtCost} onChange={updateField} min="0" step="1" full />
        </div>
      </section>

      <section className="section">
        <SectionTitle icon="chart">Results</SectionTitle>
        <div className="status">
          {messages.map((message) => (
            <div className={`message ${message.type}`} key={message.text}>{message.text}</div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function NumberField({ id, label, value, onChange, min = "0", max, step = "0.125", full = false, disabled = false, showSteppers = false }) {
  const unit = numberFieldUnit(id);
  const [draft, setDraft] = useState(() => formatFieldMeasurement(id, value));
  const [editing, setEditing] = useState(false);
  const numericValue = Number(value) || 0;

  useEffect(() => {
    if (!editing) setDraft(formatFieldMeasurement(id, value));
  }, [id, value, editing]);

  function commit(nextText = draft) {
    if (!unit) {
      onChange(id, nextText);
      return;
    }

    const parsed = parseMeasurementInput(nextText, unit);
    if (Number.isFinite(parsed)) {
      onChange(id, String(parsed));
      setDraft(unit === "ft" ? formatFeetInput(parsed) : inchFraction(parsed));
      return;
    }

    setDraft(formatFieldMeasurement(id, value));
  }

  function stepValue(direction) {
    const numericStep = Number(step) || (unit === "ft" ? 1 / 12 : 1 / 16);
    const minimum = min === undefined ? Number.NEGATIVE_INFINITY : Number(min);
    const maximum = max === undefined ? Number.POSITIVE_INFINITY : Number(max);
    const nextValue = Math.max(minimum, Math.min(maximum, numericValue + direction * numericStep));
    onChange(id, String(nextValue));
    setDraft(formatFieldMeasurement(id, nextValue));
  }

  const inputValue = unit ? draft : value;

  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`input-with-unit ${unit ? "fraction-input" : ""}`}>
        <input
          id={id}
          type={unit ? "text" : "number"}
          min={min}
          max={max}
          step={step}
          value={inputValue}
          disabled={disabled}
          inputMode={unit ? "text" : undefined}
          onFocus={() => setEditing(true)}
          onChange={(event) => {
            if (unit) {
              setDraft(event.target.value);
            } else {
              onChange(id, event.target.value);
            }
          }}
          onBlur={() => {
            setEditing(false);
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if ((unit || showSteppers) && event.key === "ArrowUp") {
              event.preventDefault();
              stepValue(1);
            }
            if ((unit || showSteppers) && event.key === "ArrowDown") {
              event.preventDefault();
              stepValue(-1);
            }
          }}
        />
        {(unit || showSteppers) && (
          <div className="field-steppers" aria-label={`${label} controls`}>
            <button type="button" tabIndex="-1" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => stepValue(1)} aria-label={`Increase ${label}`} />
            <button type="button" tabIndex="-1" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => stepValue(-1)} aria-label={`Decrease ${label}`} />
          </div>
        )}
      </div>
    </div>
  );
}

function numberFieldUnit(id) {
  if (["cwtCost", "railCount", "fenceRailCount", "fenceGateCount"].includes(id)) return "";
  if (id.endsWith("Feet") || ["fenceLengthFeet", "fenceMaxSectionFeet"].includes(id)) return "ft";
  return "in";
}

function ThicknessField({ id, label, value, onChange }) {
  const selectedValue = THICKNESS_OPTIONS.some((option) => option.value === Number(value))
    ? String(value)
    : String(THICKNESS_OPTIONS[0].value);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={selectedValue} onChange={(event) => onChange(id, event.target.value)}>
        {THICKNESS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
