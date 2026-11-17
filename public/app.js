// This file contains the html for all pages except the set list.

const main = document.querySelector("main");
const modal = document.querySelector("#modal");
const userSelect = document.querySelector("#user-select");
let options,
  userId = 5,
  page = "dances",
  dances = [],
  events = [],
  organizationId;

let venueSearch = "",
  venueArea = "";

let search = "",
  difficulty = "",
  renderVersion = 0,
  searchVersion = 0,
  toastTimer;

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const badge = (value) =>
  `<span class="badge ${escapeHtml(value)}">${escapeHtml(value)}</span>`;

const userName = () =>
  options.users.find((u) => u.id === userId)?.display_name || "";

const selectOptions = (rows, label, selected) =>
  rows
    .map(
      (row) =>
        `<option value="${row.id}" ${Number(selected) === row.id ? "selected" : ""}>${escapeHtml(row[label])}</option>`,
    )
    .join("");

const difficultyOptions = (selected) =>
  ["beginner", "improver", "intermediate", "advanced"]
    .map(
      (value) =>
        `<option value="${value}" ${selected === value ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`,
    )
    .join("");

function formatDate(value) {
  // Database times are venue-local wall times.
  return new Date(value.replace(" ", "T")).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function api(url, method = "GET", body) {
  const response = await fetch("/api" + url, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The request could not be completed.");
  return data;
}

function toast(message, error = false) {
  clearTimeout(toastTimer);
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.className = error ? "error" : "";
  el.hidden = false;
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 4500);
}

function heading(title, subtitle, action = "") {
  return `<div class="page-heading"><div><span class="eyebrow">A LITTLE RHYTHM. A LOT OF COMMUNITY.</span><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${action}</div>`;
}

function danceTable(rows, favorites = false) {
  if (!rows.length)
    return `<div class="empty">${favorites ? "No favorites yet. Visit the dance library and save a dance with the heart button." : "No dances found. Try a different search or add a new dance."}</div>`;
  return `<div class="table-wrap"><table><thead><tr><th scope="col">Dance</th><th scope="col">Difficulty</th><th scope="col" class="song-column">Song</th><th scope="col">BPM</th><th scope="col">Actions</th></tr></thead><tbody>${rows.map((d, i) => `<tr><td><div class="dance-cell"><span class="dance-number">${String(i + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(d.dance_name)}</strong>${safeLink(d.choreography_url)}</div></div></td><td>${badge(d.difficulty)}</td><td class="minor song-column">${escapeHtml(d.song_name)}</td><td class="minor">${d.tempo_bpm ?? "—"}</td><td><div class="row-actions">${favorites ? `<button class="button small" data-action="remove-favorite" data-id="${d.id}" aria-label="Remove ${escapeHtml(d.dance_name)} from favorites">Remove</button>` : `<button class="text-button" data-action="edit-dance" data-id="${d.id}">Edit</button><button class="icon-button ${d.is_favorite ? "saved" : ""}" data-action="${d.is_favorite ? "remove-favorite" : "favorite"}" data-id="${d.id}" aria-pressed="${Boolean(d.is_favorite)}" aria-label="${d.is_favorite ? "Remove" : "Save"} ${escapeHtml(d.dance_name)} ${d.is_favorite ? "from" : "to"} favorites">${d.is_favorite ? "♥" : "♡"}</button>`}</div></td></tr>`).join("")}</tbody></table></div>`;
}

function safeLink(url) {
  try {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return "";
  } catch {
    return "";
  }
  return `<div><a class="minor" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Choreography ↗</a></div>`;
}

async function loadDances() {
  const version = ++searchVersion;
  const rows = await api(
    `/dances?${new URLSearchParams({ q: search, difficulty, user_id: userId })}`,
  );
  if (version !== searchVersion || page !== "dances") return;
  dances = rows;
  const list = document.querySelector("#dance-list");
  if (list) {
    list.innerHTML = danceTable(rows);
    document.querySelector("#result-count").textContent =
      `${rows.length} dance${rows.length === 1 ? "" : "s"} in your library`;
  }
}

async function render() {
  const version = ++renderVersion;
  ++searchVersion;
  stopSetlistRefresh();
  page = [
    "dances",
    "events",
    "favorites",
    "reports",
    "profiles",
    "venues",
    "setlist",
  ].includes(location.hash.slice(1).split("?")[0])
    ? location.hash.slice(1).split("?")[0]
    : "dances";
  document.querySelectorAll("nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === page);
    if (a.dataset.page === page) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const current = () => version === renderVersion;
  main.innerHTML = '<p class="empty">Loading…</p>';
  try {
    if (page === "dances") {
      main.innerHTML =
        heading(
          "Dance library",
          "Find the next song that gets everyone on their feet.",
          '<button class="button primary" data-action="add-dance">＋ Add dance</button>',
        ) +
        `<div class="intro"><div><h2>A few steps from a great night.</h2><p>Explore the collection, learn something new, and keep your favorites close.</p></div><span class="intro-mark" aria-hidden="true">♫</span></div><form class="toolbar" id="search-form"><input name="q" aria-label="Search dances or songs" placeholder="Search dances or songs…" value="${escapeHtml(search)}" maxlength="150"><select name="difficulty" aria-label="Filter by difficulty"><option value="">All difficulties</option>${difficultyOptions(difficulty)}</select><button class="button" type="submit">Search</button><button class="text-button" type="button" data-action="clear-search">Clear</button></form><p class="result-count" id="result-count" aria-live="polite"></p><div class="card" id="dance-list"></div><p class="report-note">Save a dance with ♡ to add it to ${escapeHtml(userName())}’s favorites. Choreography links in the sample data are illustrative.</p>`;
      await loadDances();
    } else if (page === "setlist") {
      await renderSetlistPage(current);
    } else if (page === "events") {
      const rows = await api("/events");
      if (!current()) return;
      events = rows;
      main.innerHTML =
        heading(
          "Events",
          "Bring the right people, place, and music together.",
          '<button class="button primary" data-action="add-event">＋ Add event</button>',
        ) +
        `<p class="result-count">${rows.length} events · Most recent first · Times are local to each venue</p><div class="event-grid">${rows.map((e) => `<article class="event-card"><div class="date-tag">${escapeHtml(formatDate(e.starts_at))}</div><h2>${escapeHtml(e.event_name)}</h2><p class="minor">${escapeHtml(e.venue_name)} · ${escapeHtml(e.city)}, ${escapeHtml(e.state)}</p><p class="minor">DJ ${escapeHtml(e.dj_name)}</p><div class="event-bottom"><span class="badge">${e.default_genre ? escapeHtml(e.default_genre) : "No genre set"}</span><div><a class="button small setlist-link" href="#setlist?event=${e.event_id}">Set list</a><button class="text-button" data-action="event-details" data-id="${e.event_id}">Details</button><button class="text-button" data-action="edit-event" data-id="${e.event_id}">Edit</button></div></div></article>`).join("") || '<p class="empty">No events yet. Add your first dance night.</p>'}</div>`;
    } else if (page === "profiles") {
      const rows = await api("/profiles");
      if (!current()) return;
      main.innerHTML =
        heading(
          "Profiles",
          "Meet the community and create a profile of your own.",
          '<button class="button primary" data-action="add-profile">+ New profile</button>',
        ) +
        `<p class="report-note">Profiles keep personal favorites separate. Roles identify event DJs; this classroom demo does not use passwords.</p><div class="card table-wrap"><table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Profile</th></tr></thead><tbody>${rows.map((u) => `<tr><td><strong>${escapeHtml(u.display_name)}</strong></td><td>${escapeHtml(u.email)}</td><td>${badge(u.role)}</td><td>${u.id === userId ? '<span class="badge beginner">Active</span>' : `<button class="button small" data-action="use-profile" data-id="${u.id}">Use profile</button>`}</td></tr>`).join("")}</tbody></table></div>`;
    } else if (page === "venues") {
      const areas = await api("/venue-areas");
      if (!current()) return;
      // The selection indexes the current SQL-generated area list, not a saved copy of venue data.
      const selected = areas.find(
        (a) => JSON.stringify([a.city, a.state]) === venueArea,
      );
      if (!selected) venueArea = "";
      const rows = await api(
        `/venues?${new URLSearchParams({ q: venueSearch, city: selected?.city || "", state: selected?.state || "" })}`,
      );
      if (!current()) return;
      main.innerHTML =
        heading(
          "Venues",
          "Find a place to dance, by city and state.",
          '<button class="button primary" data-action="add-venue">＋ Add venue</button>',
        ) +
        `<form class="toolbar" id="venue-search-form"><input name="q" aria-label="Search venues or addresses" maxlength="150" placeholder="Search venues or street addresses…" value="${escapeHtml(venueSearch)}"><select name="area" aria-label="Filter venues by area"><option value="">All areas</option>${areas.map((a) => `<option value="${escapeHtml(JSON.stringify([a.city, a.state]))}" ${JSON.stringify([a.city, a.state]) === venueArea ? "selected" : ""}>${escapeHtml(a.city)}, ${escapeHtml(a.state)}</option>`).join("")}</select><button class="button" type="submit">Search</button><button class="text-button" type="button" data-action="clear-venues">Clear</button></form><p class="result-count">${rows.length} venue${rows.length === 1 ? "" : "s"} found</p><div class="event-grid">${rows.map((v) => `<article class="event-card"><div class="date-tag">${escapeHtml(v.city)}, ${escapeHtml(v.state)}</div><h2>${escapeHtml(v.name)}</h2><p class="minor">${escapeHtml(v.address)}</p><p class="minor">Capacity: ${v.capacity ?? "Not set"}</p><div class="event-bottom"><span class="minor">${v.event_count} event${v.event_count === 1 ? "" : "s"}</span><button class="button small" data-action="venue-event" data-id="${v.id}">Create event here</button></div></article>`).join("") || '<p class="empty">No venues match. Try another area or add a venue.</p>'}</div>`;
    } else if (page === "favorites") {
      const rows = await api(`/users/${userId}/favorites`);
      if (!current()) return;
      main.innerHTML =
        heading(
          "Your favorites",
          `A personal collection for ${escapeHtml(userName())}.`,
        ) +
        `<div class="split-heading"><h2>Saved dances</h2><span class="minor">${rows.length} saved</span></div><div class="card">${danceTable(rows, true)}</div><section class="card org-panel"><h2>Discover a club’s favorites</h2><p class="subtitle">Explore an organization’s collection and add it to your own.</p><div class="org-controls"><select id="organization-select" aria-label="Organization">${selectOptions(options.organizations, "name", organizationId)}</select><button class="button primary" data-action="import-favorites">Add collection to my favorites</button></div><div id="org-list" class="org-list"></div><p class="report-note">Dances you have already saved are skipped. The whole collection is saved together.</p></section>`;
      await loadOrganization();
    } else {
      const report = await api("/reports");
      if (!current()) return;
      const max = Math.max(
        1,
        ...report.popularity.map((d) => d.user_favorites),
      );
      main.innerHTML =
        heading(
          "Reports",
          "A closer look at what your dance community loves.",
        ) +
        `<div class="stats">${[
          ["dances", "Dances in the library"],
          ["events", "Events scheduled"],
          ["favorites", "Personal favorites"],
          ["users", "Community profiles"],
        ]
          .map(
            ([key, label]) =>
              `<div class="stat"><span>${label}</span><strong>${report.totals[key]}</strong></div>`,
          )
          .join(
            "",
          )}</div><h2 class="section-heading">Dance popularity</h2><p class="report-note">Ranked by personal favorites, then organization favorites. Each person or organization counts once per dance.</p><div class="card table-wrap"><table><thead><tr><th scope="col">Dance</th><th scope="col">Difficulty</th><th scope="col">People</th><th scope="col">Organizations</th></tr></thead><tbody>${report.popularity.map((d) => `<tr><td><strong>${escapeHtml(d.dance_name)}</strong></td><td>${badge(d.difficulty)}</td><td>${d.user_favorites}<meter class="meter" min="0" max="${max}" value="${d.user_favorites}" aria-label="${d.user_favorites} personal favorites">${d.user_favorites}</meter></td><td>${d.organization_favorites}</td></tr>`).join("")}</tbody></table></div><h2 class="section-heading">Events by venue</h2><div class="card table-wrap"><table><thead><tr><th scope="col">Venue</th><th scope="col">City</th><th scope="col">Events</th></tr></thead><tbody>${report.venues.map((v) => `<tr><td><strong>${escapeHtml(v.name)}</strong></td><td>${escapeHtml(v.city)}</td><td>${v.event_count}</td></tr>`).join("")}</tbody></table></div>`;
    }
  } catch (error) {
    if (current())
      main.innerHTML = `<div class="empty">${escapeHtml(error.message)}<br><button class="button" data-action="retry">Try again</button></div>`;
  }
}

async function loadOrganization() {
  const select = document.querySelector("#organization-select");
  if (!select) return;
  organizationId = Number(select.value);
  const selected = organizationId;
  const rows = await api(`/organizations/${selected}/favorites`);
  const list = document.querySelector("#org-list");
  if (list && selected === organizationId)
    list.innerHTML =
      rows.map((d) => `<span>${escapeHtml(d.dance_name)}</span>`).join("") ||
      '<p class="minor">This organization has no favorites yet.</p>';
}

function openForm(kind, row = {}) {
  const dance = kind === "dance",
    id = dance ? row.id : row.event_id;
  const title = `${id ? "Edit" : "Add"} ${kind}`;
  document.querySelector("#modal-content").innerHTML =
    `<h2 id="modal-title">${title}</h2><p class="modal-description">${dance ? "Keep your dance collection ready for the next night out." : "Choose a venue, a DJ, and a time to hit the floor."}</p><form id="record-form" data-kind="${kind}" data-id="${id || ""}"><div class="form-grid">${
      dance
        ? `
    <label class="field full">Dance name<input name="dance_name" value="${escapeHtml(row.dance_name)}" required maxlength="150"></label>
    <label class="field full">Song name<input name="song_name" value="${escapeHtml(row.song_name)}" required maxlength="150"></label>
    <label class="field">Difficulty<select name="difficulty">${difficultyOptions(row.difficulty || "beginner")}</select></label>
    <label class="field">Tempo (BPM, optional)<input name="tempo_bpm" type="number" min="1" max="400" step="1" value="${row.tempo_bpm ?? ""}"></label>
    <label class="field full">Choreography URL (optional)<input name="choreography_url" type="url" maxlength="1000" placeholder="https://…" value="${escapeHtml(row.choreography_url)}"></label>`
        : `
    <label class="field full">Event name<input name="event_name" value="${escapeHtml(row.event_name)}" required maxlength="150"></label>
    <label class="field full">Venue<select name="venue_id">${selectOptions(
      options.venues.map((v) => ({
        ...v,
        label: `${v.name} — ${v.city}, ${v.state}`,
      })),
      "label",
      row.venue_id,
    )}</select></label>
    <label class="field">DJ<select name="dj_user_profile_id">${selectOptions(options.djs, "display_name", row.dj_user_profile_id)}</select></label>
    <label class="field">Local start time<input name="starts_at" type="datetime-local" required min="1900-01-01T00:00" max="9999-12-31T23:59" value="${escapeHtml(row.starts_at?.replace(" ", "T").slice(0, 16))}"></label>`
    }</div><div id="form-error" class="form-error" role="alert" hidden></div><div class="modal-actions"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button primary" type="submit">${id ? "Save changes" : `Add ${kind}`}</button></div></form>`;
  modal.showModal();
}

function openCreateForm(kind) {
  const profile = kind === "profile";
  const fields = profile
    ? `
    <label class="field full">Display name<input name="display_name" required maxlength="150" autocomplete="name"></label>
    <label class="field full">Email<input name="email" type="email" required maxlength="254" autocomplete="email"></label>
    <label class="field full">Role<select name="role"><option value="attendee">Attendee</option><option value="dj">DJ</option><option value="admin">Admin</option></select></label>`
    : `
    <label class="field full">Venue name<input name="name" required maxlength="150"></label>
    <label class="field full">Street address<input name="address" required maxlength="250" autocomplete="street-address"></label>
    <label class="field full">City<input name="city" required maxlength="100" autocomplete="address-level2"></label>
    <label class="field">State abbreviation<input name="state" required minlength="2" maxlength="2" pattern="[A-Za-z]{2}" placeholder="TN" autocomplete="address-level1"></label>
    <label class="field">Capacity (optional)<input name="capacity" type="number" min="1" max="1000000" step="1"></label>`;
  document.querySelector("#modal-content").innerHTML =
    `<h2 id="modal-title">${profile ? "New profile" : "Add venue"}</h2><p class="modal-description">${profile ? "Your new profile will become the active profile." : "The venue will be available when creating or editing events."}</p><form id="record-form" data-kind="${kind}" data-id=""><div class="form-grid">${fields}</div><div id="form-error" class="form-error" role="alert" hidden></div><div class="modal-actions"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button primary" type="submit">${profile ? "Create profile" : "Add venue"}</button></div></form>`;
  modal.showModal();
}

async function refreshOptions() {
  options = await api("/options");
  userSelect.innerHTML = selectOptions(options.users, "display_name", userId);
}

async function eventDetails(id) {
  const e = await api(`/events/${id}`);
  const fields = [
    ["When", formatDate(e.starts_at) + " (venue local)"],
    ["Venue", e.venue_name],
    ["Address", `${e.address}, ${e.city}, ${e.state}`],
    ["Capacity", e.capacity ?? "Not set"],
    ["DJ", e.dj_name],
    ["Genre", e.default_genre ?? "Not set"],
    [
      "Auto mix",
      e.auto_mix_enabled == null
        ? "Settings not saved"
        : e.auto_mix_enabled
          ? "On"
          : "Off",
    ],
    [
      "Transition",
      e.transition_seconds == null
        ? "Not set"
        : `${e.transition_seconds} seconds`,
    ],
    [
      "Explicit filter",
      e.explicit_content_filter == null
        ? "Settings not saved"
        : e.explicit_content_filter
          ? "On"
          : "Off",
    ],
  ];
  document.querySelector("#modal-content").innerHTML =
    `<h2 id="modal-title">${escapeHtml(e.event_name)}</h2><p class="modal-description">Everything you need to plan your night.</p><dl class="details">${fields.map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl><div class="modal-actions"><button class="button primary" data-action="close-modal">Close</button></div>`;
  modal.showModal();
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action,
    id = Number(button.dataset.id);
  if (action.startsWith("setlist-")) return;
  button.disabled = true;
  try {
    if (action === "add-dance") openForm("dance");
    if (action === "edit-dance")
      openForm(
        "dance",
        dances.find((d) => d.id === id),
      );
    if (action === "add-event") openForm("event");
    if (action === "add-profile") openCreateForm("profile");
    if (action === "add-venue") openCreateForm("venue");
    if (action === "venue-event") openForm("event", { venue_id: id });
    if (action === "use-profile") {
      userId = id;
      userSelect.value = String(id);
      await render();
    }
    if (action === "clear-venues") {
      venueSearch = "";
      venueArea = "";
      await render();
    }
    if (action === "edit-event")
      openForm(
        "event",
        events.find((e) => e.event_id === id),
      );
    if (action === "event-details") await eventDetails(id);
    if (action === "close-modal") modal.close();
    if (action === "retry") await render();
    if (action === "clear-search") {
      search = "";
      difficulty = "";
      await render();
    }
    if (action === "favorite" || action === "remove-favorite") {
      const result = await api(
        `/users/${userId}/favorites${action === "remove-favorite" ? "/" + id : ""}`,
        action === "favorite" ? "POST" : "DELETE",
        action === "favorite" ? { line_dance_id: id } : undefined,
      );
      toast(result.message);
      await render();
    }
    if (action === "import-favorites") {
      const result = await api(`/users/${userId}/import-favorites`, "POST", {
        organization_id: organizationId,
      });
      toast(result.message);
      await render();
    }
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.id === "search-form") {
    event.preventDefault();
    search = event.target.elements.q.value;
    difficulty = event.target.elements.difficulty.value;
    try {
      await loadDances();
    } catch (error) {
      toast(error.message, true);
    }
    return;
  }
  if (event.target.id === "venue-search-form") {
    event.preventDefault();
    venueSearch = event.target.elements.q.value;
    venueArea = event.target.elements.area.value;
    await render();
    return;
  }
  if (event.target.id !== "record-form") return;
  event.preventDefault();
  const form = event.target,
    button = form.querySelector('button[type="submit"]'),
    errorEl = document.querySelector("#form-error");
  button.disabled = true;
  errorEl.hidden = true;
  try {
    const id = form.dataset.id;
    const endpoint = {
      dance: "dances",
      event: "events",
      profile: "profiles",
      venue: "venues",
    }[form.dataset.kind];
    const result = await api(
      `/${endpoint}${id ? "/" + id : ""}`,
      id ? "PUT" : "POST",
      Object.fromEntries(new FormData(form)),
    );
    if (form.dataset.kind === "profile") userId = result.id;
    if (form.dataset.kind === "profile" || form.dataset.kind === "venue") {
      // Close immediately after the successful save so a failed follow-up read cannot cause a duplicate submission.
      modal.close();
      await refreshOptions();
      if (form.dataset.kind === "venue") {
        venueSearch = "";
        venueArea = JSON.stringify([result.city, result.state]);
      }
    }
    modal.close();
    toast("Saved successfully.");
    await render();
  } catch (error) {
    if (modal.open) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
    } else {
      toast(
        "Saved, but the refreshed options could not be loaded. Reload the page before continuing.",
        true,
      );
    }
  } finally {
    button.disabled = false;
  }
});

document.addEventListener("change", async (event) => {
  try {
    if (event.target.id === "user-select") {
      userId = Number(event.target.value);
      await render();
    }
    if (event.target.id === "organization-select") await loadOrganization();
    if (
      event.target.name === "area" &&
      event.target.closest("#venue-search-form")
    ) {
      venueArea = event.target.value;
      venueSearch =
        document.querySelector("#venue-search-form").elements.q.value;
      await render();
    }
    if (
      event.target.name === "difficulty" &&
      event.target.closest("#search-form")
    ) {
      difficulty = event.target.value;
      search = document.querySelector("#search-form").elements.q.value;
      await loadDances();
    }
  } catch (error) {
    toast(error.message, true);
  }
});

window.addEventListener("hashchange", render);
async function init() {
  try {
    options = await api("/options");
    organizationId = options.organizations[0]?.id;
    userSelect.innerHTML = selectOptions(options.users, "display_name", userId);
    await render();
  } catch (error) {
    main.innerHTML = `<div class="empty">${escapeHtml(error.message)} Refresh the page to retry.</div>`;
  }
}
init();
