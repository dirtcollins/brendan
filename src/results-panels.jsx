function partColorKey(type = "") {
  const value = type.toLowerCase();
  if (value.includes("post")) return "post";
  if (value.includes("frame")) return "frame";
  if (value.includes("picket")) return "picket";
  if (value.includes("rail")) return "rail";
  return "metal";
}

function PartSwatch({ type, label }) {
  const key = partColorKey(type);
  return (
    <span className={`part-swatch part-swatch-${key}`} aria-label={label || type} title={label || type} />
  );
}

function Materials({ settings, calc, rows }) {
  const gateWeightItems = calc.doubleGate
    ? [
      ["Left leaf", pounds(calc.leftGateWeight, 1)],
      ["Right leaf", pounds(calc.rightGateWeight, 1)],
      ["Frame", pounds(calc.gateFrameWeight, 1)],
      ["Pickets", pounds(calc.gatePicketWeight, 1)]
    ]
    : [
      ["Gate leaf", pounds(calc.leftGateWeight, 1)],
      ["Frame", pounds(calc.gateFrameWeight, 1)],
      ["Pickets", pounds(calc.gatePicketWeight, 1)]
    ];
  return (
    <div className="cards">
      {rows.map((row) => <MaterialCard row={row} key={row[0]} />)}
      <article className="item-card item-card-frame">
        <strong>{pounds(calc.totalGateWeight, 1)}</strong>
        <span className="item-label"><PartSwatch type="Frame" />Gate weights</span>
        <SpecList items={gateWeightItems} />
      </article>
      <article className="item-card">
        <strong>{pounds(calc.totalMetalWeight, 1)}</strong>
        <span>Steel weight to buy</span>
        <SpecList items={[
          ["Full sticks", feet(calc.purchasedLength, 2)],
          ["Cut length", feet(calc.usedLength, 2)],
          ["Leftover", feet(calc.stockWaste, 2)]
        ]} />
      </article>
      <article className="item-card">
        <strong>{money(calc.metalCost)}</strong>
        <span>Estimated metal cost</span>
        <SpecList items={[
          ["Rate", `${money(settings.cwtCost)} per CWT`],
          ["Basis", "Full sticks"]
        ]} />
      </article>
    </div>
  );
}

function FenceMaterials({ settings, calc, rows }) {
  return (
    <div className="cards">
      {rows.map((row) => <MaterialCard row={row} key={row[0]} />)}
      <article className="item-card item-card-post">
        <strong>{calc.stockPlans[0].best.sticks} x {calc.stockPlans[0].best.label}</strong>
        <span className="item-label"><PartSwatch type="Post" />Post stock to buy</span>
        <SpecList items={[
          ["Full sticks", feet(calc.purchasedLength, 2)],
          ["Cut length", feet(calc.usedLength, 2)],
          ["Leftover", feet(calc.stockWaste, 2)]
        ]} />
      </article>
      <article className="item-card">
        <strong>{money(calc.metalCost)}</strong>
        <span>Estimated post cost</span>
        <SpecList items={[
          ["Weight", pounds(calc.totalMetalWeight, 1)],
          ["Rate", `${money(settings.cwtCost)} per CWT`]
        ]} />
      </article>
    </div>
  );
}

function MaterialCard({ row }) {
  const [name, qty, material, length, wall, notes] = row;
  const materialText = wall ? String(material).replace(`, ${wall} wall`, "") : material;
  return (
    <article className={`item-card item-card-${partColorKey(name)}`}>
      <strong>Qty: {qty}</strong>
      <span className="item-label"><PartSwatch type={name} />{name}</span>
      <SpecList items={[
        ["Material", materialText],
        length ? ["Cut length", length] : null,
        wall ? ["Wall", wall] : null,
        notes ? ["Notes", notes] : null
      ]} />
    </article>
  );
}

function SpecList({ items }) {
  return (
    <dl className="spec-list">
      {items.filter(Boolean).map(([label, value]) => (
        <div className="spec-row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Purchase({ settings, calc }) {
  return (
    <div className="purchase-view">
      <div className="cards purchase-summary">
        <article className="item-card">
          <strong>{money(calc.metalCost)}</strong>
          <span>Estimated metal cost</span>
          <p>Full sticks calculated at {money(settings.cwtCost)} per CWT</p>
        </article>
        <article className="item-card">
          <strong>{pounds(calc.totalMetalWeight, 1)}</strong>
          <span>Steel weight to buy</span>
          <p>{feet(calc.purchasedLength, 2)} purchased length</p>
        </article>
        <article className="item-card">
          <strong>{feet(calc.stockWaste, 2)}</strong>
          <span>Expected leftover</span>
          <p>{feet(calc.usedLength, 2)} used from purchased stock</p>
        </article>
      </div>

      <div className="table-wrap purchase-table">
        <table>
          <thead>
            <tr>
              <th>Color</th>
              <th>Material</th>
              <th>Tube</th>
              <th>Buy</th>
              <th>Used</th>
              <th>Leftover</th>
              <th>Buy Weight</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {calc.stockPlans.map((plan) => (
              <tr key={plan.name}>
                <td data-label="Color"><PartSwatch type={plan.name} label={plan.name} /></td>
                <td data-label="Material">{plan.name}</td>
                <td data-label="Tube">{tubeSpecFraction(plan.size, plan.thickness)}</td>
                <td data-label="Buy">{plan.best.sticks} x {plan.best.label}</td>
                <td data-label="Used" className="num">{feet(plan.best.used, 2)}</td>
                <td data-label="Leftover" className="num">{feet(plan.best.waste, 2)}</td>
                <td data-label="Buy Weight" className="num">{pounds(plan.purchasedWeight, 1)}</td>
                <td data-label="Cost" className="num">{money((plan.purchasedWeight / 100) * settings.cwtCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FencePurchase({ settings, calc }) {
  const postPlan = calc.stockPlans[0];
  return (
    <div className="purchase-view">
      <div className="cards purchase-summary">
        <article className="item-card">
          <strong>{postPlan.best.sticks} x {postPlan.best.label}</strong>
          <span>Post stock</span>
          <p>{tubeSpecFraction(settings.postWidth, settings.postThickness)}</p>
        </article>
        <article className="item-card">
          <strong>{calc.totalPickets}</strong>
          <span>{settings.fencePicketMaterial} dog-ear pickets</span>
          <p>{inchFraction(settings.fencePicketWidth)} wide, no gaps</p>
        </article>
        <article className="item-card">
          <strong>{calc.railCuts}</strong>
          <span>Rail pieces</span>
          <p>{settings.fenceRailCount} rails per section</p>
        </article>
      </div>
      <div className="table-wrap purchase-table">
        <table>
          <thead>
            <tr><th>Color</th><th>Material</th><th>Buy</th><th>Used</th><th>Leftover</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Color"><PartSwatch type="Post" label="Post" /></td>
              <td data-label="Material">Posts</td>
              <td data-label="Buy">{postPlan.best.sticks} x {postPlan.best.label}</td>
              <td data-label="Used" className="num">{feet(postPlan.best.used, 2)}</td>
              <td data-label="Leftover" className="num">{feet(postPlan.best.waste, 2)}</td>
              <td data-label="Notes">{money(calc.metalCost)} estimated metal cost</td>
            </tr>
            <tr>
              <td data-label="Color"><PartSwatch type="Picket" label="Picket" /></td>
              <td data-label="Material">{settings.fencePicketMaterial} dog-ear pickets</td>
              <td data-label="Buy">{calc.totalPickets} pickets</td>
              <td data-label="Used" className="num">{feet(calc.totalPickets * settings.fencePicketHeight, 2)}</td>
              <td data-label="Leftover" className="num">By lumber order</td>
              <td data-label="Notes">{inchFraction(settings.fencePicketWidth)} wide, vertical, no spacing</td>
            </tr>
            <tr>
              <td data-label="Color"><PartSwatch type="Rail" label="Rail" /></td>
              <td data-label="Material">Fence rails</td>
              <td data-label="Buy">{calc.railCuts} rail cuts</td>
              <td data-label="Used" className="num">{feet(calc.sectionTotal * settings.fenceRailCount, 2)}</td>
              <td data-label="Leftover" className="num">By lumber order</td>
              <td data-label="Notes">Cut to each section length</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CutList({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>Color</th><th>Part</th><th>Qty</th><th>Length</th><th>Width</th><th>Wall</th><th>Stock Needed</th><th>Type</th><th>Notes</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              <td data-label="#" className="num">{row[0]}</td>
              <td data-label="Color"><PartSwatch type={row[7]} label={row[7]} /></td>
              <td data-label="Part">{row[1]}</td>
              <td data-label="Qty" className="num">{row[2]}</td>
              <td data-label="Length" className="num">{row[3]}</td>
              <td data-label="Width" className="num">{row[4]}</td>
              <td data-label="Wall" className="num">{row[5]}</td>
              <td data-label="Stock">{row[6]}</td>
              <td data-label="Type">{row[7]}</td>
              <td data-label="Notes">{row[8]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPanel({ settings, updateField }) {
  return (
    <div className="settings-panel">
      <div className="settings-grid">
        <section className="settings-card">
          <SectionTitle icon="dollar">Metal Defaults</SectionTitle>
          <div className="form-grid">
            <NumberField id="cwtCost" label="Cost per CWT" value={settings.cwtCost} onChange={updateField} min="0" step="1" full />
            <NumberField id="postWidth" label="Default post width" value={settings.postWidth} onChange={updateField} min="0.5" />
            <ThicknessField id="postThickness" label="Default post wall" value={settings.postThickness} onChange={updateField} />
          </div>
        </section>
        <section className="settings-card">
          <SectionTitle icon="gate">Gate Defaults</SectionTitle>
          <div className="form-grid">
            <NumberField id="postEmbed" label="Post in ground" value={settings.postEmbed} onChange={updateField} min="0" />
            <NumberField id="centerGap" label="Center gap" value={settings.centerGap} onChange={updateField} />
            <NumberField id="postGap" label="Post-to-gate gap" value={settings.postGap} onChange={updateField} />
            <NumberField id="railCount" label="Rails per leaf" value={settings.railCount} onChange={updateField} min="2" max="6" step="1" />
          </div>
        </section>
        <section className="settings-card">
          <SectionTitle icon="fence">Fence Defaults</SectionTitle>
          <div className="form-grid">
            <NumberField id="fencePostEmbed" label="Posts in ground" value={settings.fencePostEmbed} onChange={updateField} min="0" />
            <NumberField id="fenceMaxSectionFeet" label="Max section length" value={settings.fenceMaxSectionFeet} onChange={updateField} min="1" step="0.25" />
            <NumberField id="fenceRailCount" label="Rails per section" value={settings.fenceRailCount} onChange={updateField} min="2" max="4" step="1" />
          </div>
        </section>
        <section className="settings-card">
          <SectionTitle icon="ruler">Shop Assumptions</SectionTitle>
          <SpecList items={[
            ["Steel stock lengths", STOCK_LENGTH_OPTIONS.map((option) => option.label).join(" or ")],
            ["Picket spacing goal", `${PICKET_TARGET_GAP} in minimum clear spacing`],
            ["Fence pickets", "Vertical dog-ear pickets with no gap"],
            ["Saved builds", "Cloud saved to the signed-in user account"]
          ]} />
        </section>
        <section className="settings-card">
          <SectionTitle icon="settings">Google Sign-In Setup</SectionTitle>
          <SpecList items={[
            ["Supabase provider", "Enable Google in Authentication > Providers"],
            ["Google redirect URL", "Use the callback URL shown in Supabase's Google provider settings"],
            ["Site URL", "Set this to the live app URL after publishing"],
            ["Local testing", "Use http://localhost:4173 while developing"]
          ]} />
        </section>
      </div>
    </div>
  );
}

function SavedBuilds({ builds, currentBuildId, onLoad, onDuplicate, onDelete, loading, error }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const filteredBuilds = builds
    .filter((build) => {
      const buildMode = normalizeSettings(build.settings).buildMode;
      const matchesType = typeFilter === "all" || buildMode === typeFilter;
      const searchText = `${build.name} ${buildMode}`.toLowerCase();
      return matchesType && searchText.includes(search.trim().toLowerCase());
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="saved-builds">
      <div className="saved-head">
        <div>
          <strong>{builds.length} saved {builds.length === 1 ? "build" : "builds"}</strong>
          <span>Load any saved gate or fence back into the calculator.</span>
        </div>
        <div className="saved-tools">
          <label className="saved-search">
            <span>Search</span>
            <input
              type="search"
              value={search}
              placeholder="Find a saved build"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="saved-search saved-type-filter">
            <span>Type</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All builds</option>
              <option value="gate">Gates</option>
              <option value="fence">Fences</option>
            </select>
          </label>
        </div>
      </div>
      {loading && <div className="message ok">Loading saved projects...</div>}
      {error && <div className="message bad">{error}</div>}
      {filteredBuilds.length === 0 ? (
        <div className="empty-state">
          {builds.length === 0 ? "No saved builds yet." : "No saved builds match that search."}
        </div>
      ) : (
        <div className="build-list">
          {filteredBuilds.map((build) => {
            const buildSettings = normalizeSettings(build.settings);
            const buildCalc = buildSettings.buildMode === "fence" ? calculateFence(buildSettings) : calculate(buildSettings);
            const isCurrent = build.id === currentBuildId;
            const detail = buildSettings.buildMode === "fence"
              ? `${feet(buildCalc.totalLength, 2)} fence, ${buildCalc.sections.length} sections, ${buildCalc.totalPickets} pickets`
              : buildCalc.doubleGate
                ? `${inch(buildCalc.opening, 2)} opening, left ${inch(buildCalc.leftLeafWidth, 2)}, right ${inch(buildCalc.rightLeafWidth, 2)}, ${buildSettings.leftPicketCount}/${buildSettings.rightPicketCount} pickets`
                : `${inch(buildCalc.opening, 2)} opening, single ${inch(buildCalc.leftLeafWidth, 2)}, ${buildSettings.leftPicketCount} pickets`;
            const stopRowLoad = (event) => event.stopPropagation();
            return (
              <article
                className={`build-row ${isCurrent ? "active" : ""}`}
                key={build.id}
                role="button"
                tabIndex="0"
                onClick={() => onLoad(build)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onLoad(build);
                  }
                }}
              >
                <div>
                  <strong>{build.name}</strong>
                  <span>{detail}</span>
                  <span>Updated {formatDateTime(build.updatedAt)}</span>
                </div>
                <div className="build-actions" onClick={stopRowLoad}>
                  {isCurrent && <span className="current-badge">Open</span>}
                  <button className="btn" type="button" onClick={() => onDuplicate(build)}>Duplicate</button>
                  <button className="btn danger" type="button" onClick={() => onDelete(build.id)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeatureRequests({ requests, onAdd, onDelete, loading, error, ownerMode = false }) {
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      await onAdd({ title: details.slice(0, 80), details, priority });
      setDetails("");
      setPriority("Normal");
      setStatus("Feature request submitted.");
    } catch (requestError) {
      setStatus(requestError.message || "Could not submit feature request.");
    }
    setBusy(false);
  }

  async function remove(id) {
    setBusy(true);
    setStatus("");
    try {
      await onDelete(id);
    } catch (requestError) {
      setStatus(requestError.message || "Could not delete feature request.");
    }
    setBusy(false);
  }

  return (
    <div className="feature-requests">
      <form className="request-form" onSubmit={submit}>
        <div className="saved-head">
          <div>
            <strong>Request a feature</strong>
            <span>We’d love your feedback—tell us what features you’d like us to fix or add.</span>
          </div>
        </div>
        <label className="auth-field">
          <span>Feature request</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Tell us what you want fixed or added" rows="5" required />
        </label>
        <label className="auth-field">
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </select>
        </label>
        {status && <div className="auth-status">{status}</div>}
        {error && <div className="message bad">{error}</div>}
        <button className="btn new-build" type="submit" disabled={busy}>{busy ? "Saving..." : "Submit Request"}</button>
      </form>
      <div className="build-list">
        {loading && <div className="message ok">Loading feature requests...</div>}
        {requests.length === 0 && !loading ? (
          <div className="empty-state">No feature requests yet.</div>
        ) : requests.map((request) => (
          <article className="build-row" key={request.id}>
            <div>
              <strong>{request.title}</strong>
              <span>{request.details || "No details provided."}</span>
              <span>{request.priority} priority · {request.status} · {request.buildMode} · {formatDateTime(request.createdAt)}</span>
              {ownerMode && <span>User {request.userId || "unknown"} · Build {request.buildName || "not named"}</span>}
            </div>
            <div className="build-actions">
              <button className="btn danger" type="button" disabled={busy} onClick={() => remove(request.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function BuildNotes({ settings, calc }) {
  const openingFormula = calc.doubleGate
    ? `${inch(settings.leftLeafWidth)} left leaf + ${inch(settings.rightLeafWidth)} right leaf + two post-to-gate gaps + center gap = ${inch(calc.opening, 2)}`
    : `${inch(settings.leftLeafWidth)} gate leaf + ${settings.hingePostSide} hinge post gap ${inch(settings.hingeGap)} + latch post gap ${inch(settings.latchGap)} = ${inch(calc.opening, 2)}`;
  const picketSpacingNote = calc.doubleGate
    ? `Left ${settings.leftPicketCount} pickets at ${inch(calc.leftPicketGap)} clear spacing. Right ${settings.rightPicketCount} pickets at ${inch(calc.rightPicketGap)} clear spacing.`
    : `${settings.leftPicketCount} pickets at ${inch(calc.leftPicketGap)} clear spacing.`;
  const gateWeightNote = calc.doubleGate
    ? `Left leaf ${pounds(calc.leftGateWeight, 1)}, right leaf ${pounds(calc.rightGateWeight, 1)}, ${pounds(calc.totalGateWeight, 1)} total. Posts and leftover stock are not included.`
    : `Gate leaf ${pounds(calc.leftGateWeight, 1)}. Posts and leftover stock are not included.`;
  const notes = [
    ["Opening formula", openingFormula],
    ["Outside width", `${inch(calc.opening, 2)} opening + two ${inch(settings.postWidth)} posts = ${inch(calc.outside, 2)}`],
    ["Post length", `${inch(settings.postHeight)} above ground + ${inch(settings.postEmbed)} in ground = ${inch(calc.postCutLength)} post cut length.`],
    ["Picket spacing", picketSpacingNote],
    ...(!calc.doubleGate ? [["Single gate swing", `${settings.hingePostSide === "left" ? "Left" : "Right"} post is the hinge post. Left side gap ${inch(calc.leftPostGap)}, right side gap ${inch(calc.rightPostGap)}.`]] : []),
    ["Tube thickness", `Posts ${thicknessLabel(settings.postThickness)} wall, frame ${thicknessLabel(settings.frameThickness)} wall, pickets ${thicknessLabel(settings.picketThickness)} wall.`],
    ["Stock choice", calc.stockPlans.map((plan) => `${plan.name}: buy ${plan.best.sticks} x ${plan.best.label}`).join("; ")],
    ["Gate weight", gateWeightNote],
    ["Steel cost", `${pounds(calc.totalMetalWeight, 1)} purchased weight at ${money(settings.cwtCost)} CWT = ${money(calc.metalCost)} estimated metal cost.`],
    ["Rail assumption", `${settings.railCount} horizontal rail cuts per leaf. Horizontal rails fit between vertical frame members.`]
  ];

  return (
    <div className="notes">
      {notes.map(([label, text]) => (
        <div className="note-row" key={label}>
          <strong>{label}</strong>
          <div>{text}</div>
        </div>
      ))}
    </div>
  );
}

function FenceBuildNotes({ settings, calc }) {
  const notes = [
    ["Section layout", `${feet(calc.totalLength, 2)} total fence run minus ${feet(calc.totalGateOpening, 2)} of gate openings leaves ${feet(calc.fenceRunLength, 2)} of fence sections.`],
    ["Even section rule", `${calc.sections.length} section${calc.sections.length === 1 ? "" : "s"} at ${calc.sections.length ? feet(calc.sections[0], 2) : "0 ft"} each, with no section over ${feet(calc.maxSection, 0)}.`],
    ["Posts", `${calc.totalPostCount} posts cut to ${inch(calc.postCutLength, 2)}: ${inch(settings.fenceHeight, 2)} above grade + ${inch(settings.fencePostEmbed, 2)} in ground.`],
    ["Pickets", `${calc.totalPickets} ${settings.fencePicketMaterial} standard dog-ear pickets, ${inchFraction(settings.fencePicketWidth)} wide, vertical, no gap.`],
    ["Rails", `${settings.fenceRailCount} rails per section for ${calc.railCuts} rail cuts total.`],
    ["Post stock", `Buy ${calc.stockPlans[0].best.sticks} x ${calc.stockPlans[0].best.label} for PostMaster metal posts. Estimated post metal cost is ${money(calc.metalCost)}.`]
  ];

  return (
    <div className="notes">
      {notes.map(([label, text]) => (
        <div className="note-row" key={label}>
          <strong>{label}</strong>
          <div>{text}</div>
        </div>
      ))}
    </div>
  );
}
