// This file contains the html for the setlist tab in the app.

let setlistEventId = null;
let setlistTimer = null;
let setlistSequence = 0;
let setlistBusy = false;
let setlistHtml = "";

function stopSetlistRefresh() {
  clearInterval(setlistTimer);
  setlistTimer = null;
  setlistSequence++;
}

function setlistTime(value) {
  if (!value) return "";

  return new Date(value.replace(" ", "T") + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function renderSetlistPage(current) {
  const events = await api("/events");
  if (!current()) return;

  const eventId = Number(
    new URLSearchParams(location.hash.split("?")[1]).get("event"),
  );

  const selected =
    events.find(event => event.event_id === eventId) ||
    events.find(event => event.event_id === setlistEventId) ||
    events[0];

  if (!selected) {
    main.innerHTML = heading(
      "Event set list",
      "Create an event to start a set list.",
    );
    return;
  }

  setlistEventId = selected.event_id;
  setlistHtml = "";

  main.innerHTML = heading(
    "Event set list",
    "Request songs, vote, and follow the event’s played songs.",
    '<button class="button primary" data-action="setlist-request">＋ Request song</button>',
  ) + `
    <div class="setlist-selector">
      <label class="field">Current event
        <select id="setlist-event-select">
          ${events.map(event => `
            <option value="${event.event_id}"
              ${event.event_id === setlistEventId ? "selected" : ""}>
              ${escapeHtml(event.event_name)}
            </option>
          `).join("")}
        </select>
      </label>
      <button class="button" data-action="setlist-refresh">Refresh</button>
    </div>

    <section class="intro setlist-intro">
      <div>
        <h2>${escapeHtml(selected.event_name)}</h2>
        <p>
          ${escapeHtml(selected.venue_name)} ·
          ${escapeHtml(selected.city)}, ${escapeHtml(selected.state)}<br>
          DJ ${escapeHtml(selected.dj_name)} ·
          ${escapeHtml(formatDate(selected.starts_at))}
        </p>
      </div>
    </section>

    <p id="setlist-permissions" class="report-note"></p>
    <p id="setlist-sync" class="minor" role="status">Loading…</p>
    <div id="setlist-lists"></div>
  `;

  await refreshSetlist();
  if (!current()) return;

  setlistTimer = setInterval(() => {
    if (!document.hidden && !modal.open && !setlistBusy) {
      refreshSetlist().catch(showSetlistSyncError);
    }
  }, 5000);
}

function showSetlistSyncError(error) {
  const message = document.querySelector("#setlist-sync");

  if (page === "setlist" && message) {
    message.textContent =
      `Could not refresh. ${error.message} Try Refresh again.`;
  }
}

async function refreshSetlist() {
  if (page !== "setlist") return;

  const sequence = ++setlistSequence;
  const eventId = setlistEventId;
  const profileId = userId;
  const data = await api(`/events/${eventId}/setlist?user_id=${profileId}`);

  // Ignore responses for a page or profile that has since changed.
  if (
    sequence !== setlistSequence ||
    page !== "setlist" ||
    eventId !== setlistEventId ||
    profileId !== userId
  ) {
    return;
  }

  const html = setlistLists(data);

  if (html !== setlistHtml) {
    document.querySelector("#setlist-lists").innerHTML = html;
    setlistHtml = html;
  }

  document.querySelector("#setlist-permissions").textContent = data.can_manage
    ? "Mark a song played when it finishes. Remove or restore songs as needed."
    : `Request and vote as ${userName()}. ${data.event.dj_name} and admins manage the list.`;

  document.querySelector("#setlist-sync").textContent =
    `Updated ${new Date().toLocaleTimeString()} · Refreshes every 5 seconds`;
}

function requestSongCell(song) {
  return `
    <strong>${escapeHtml(song.song_name)}</strong>
    <div class="minor">${escapeHtml(song.artist || "")}</div>
    <div class="minor">
      ${escapeHtml(song.dance_name || "Dance not specified")}
    </div>
  `;
}

function setlistTable(songs, status, canManage) {
  if (!songs.length) {
    return '<p class="empty">No songs in this list yet.</p>';
  }

  const rows = songs.map((song, index) => {
    let actions = "";
    let details = `Requested by ${escapeHtml(song.requested_by_name)}`;

    if (status === "pending") {
      details += `<br>${index === 0 ? "Next up" : `Position ${index + 1}`}`;

      actions = `
        <button class="vote-button ${song.has_upvoted ? "voted" : ""}"
          data-action="setlist-vote"
          data-request-id="${song.id}"
          data-upvoted="${Boolean(song.has_upvoted)}"
          aria-pressed="${Boolean(song.has_upvoted)}"
          aria-label="${song.has_upvoted ? "Remove upvote from" : "Upvote"} ${escapeHtml(song.song_name)}">
          ▲ ${song.votes}
        </button>
      `;

      if (canManage) {
        actions += `
          <button class="button primary small"
            data-action="setlist-played"
            data-request-id="${song.id}">
            ✓ Played
          </button>

          <button class="text-button"
            data-action="setlist-remove"
            data-request-id="${song.id}">
            Remove
          </button>
        `;
      }
    } else {
      if (status === "played") {
        details += `<br>Played ${escapeHtml(setlistTime(song.played_at))}`;
        details += `<br>Checked off by ${escapeHtml(song.played_by_name)}`;
      }

      if (canManage) {
        actions = `
          <button class="button small"
            data-action="setlist-restore"
            data-request-id="${song.id}">
            Restore to queue
          </button>
        `;
      }
    }

    return `
      <tr>
        <td>${requestSongCell(song)}</td>
        <td class="minor">${details}</td>
        <td><div class="row-actions">${actions}</div></td>
      </tr>
    `;
  }).join("");

  return `
    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Song / dance</th>
            <th>Details</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function setlistLists(data) {
  let html = `
    <h2 class="section-heading">Up next (${data.pending.length})</h2>
    <p class="report-note">
      One upvote per profile per song. Earlier requests win ties.
    </p>

    ${setlistTable(data.pending, "pending", data.can_manage)}

    <p class="report-note">
      Each request starts with your upvote. Click ▲ to remove or add your vote.
    </p>

    <h2 class="section-heading">Played songs (${data.played.length})</h2>
    ${setlistTable(data.played, "played", data.can_manage)}
  `;

  if (data.can_manage && data.removed.length) {
    html += `
      <h2 class="section-heading">
        Removed requests (${data.removed.length})
      </h2>
      ${setlistTable(data.removed, "removed", true)}
    `;
  }

  return html;
}

async function openSongRequest() {
  const eventId = setlistEventId;
  const profileId = userId;
  const library = await api(`/dances?user_id=${profileId}`);

  if (
    page !== "setlist" ||
    eventId !== setlistEventId ||
    profileId !== userId
  ) {
    return;
  }

  document.querySelector("#modal-content").innerHTML = `
    <h2 id="modal-title">Request a song</h2>
    <p class="modal-description">
      Choose a library song or enter your own song below.
    </p>

    <form id="setlist-request-form" data-event-id="${eventId}">
      <div class="form-grid">
        <label class="field full">From the library (optional)
          <select id="request-library" name="line_dance_id">
            <option value="">Custom song</option>

            ${library.map(song => `
              <option value="${song.id}"
                data-song="${escapeHtml(song.song_name)}"
                data-dance="${escapeHtml(song.dance_name)}">
                ${escapeHtml(song.song_name)} — ${escapeHtml(song.dance_name)}
              </option>
            `).join("")}
          </select>
        </label>

        <label class="field full">Song name
          <input id="request-song" name="song_name" required maxlength="150">
        </label>

        <label class="field full">Dance name (optional)
          <input id="request-dance" name="dance_name" maxlength="150">
        </label>

        <label class="field full">Artist (optional)
          <input name="artist" maxlength="150">
        </label>
      </div>

      <div id="request-error" class="form-error" role="alert" hidden></div>

      <div class="modal-actions">
        <button class="button" type="button" data-action="close-modal">
          Cancel
        </button>
        <button class="button primary" type="submit">Add to set list</button>
      </div>
    </form>
  `;

  modal.showModal();
}

document.addEventListener("change", event => {
  const input = event.target;

  if (input.id === "setlist-event-select") {
    location.hash = `setlist?event=${input.value}`;
  }

  if (input.id === "request-library") {
    const option = input.selectedOptions[0];
    const song = document.querySelector("#request-song");
    const dance = document.querySelector("#request-dance");

    song.value = option.dataset.song || "";
    dance.value = option.dataset.dance || "";
    song.readOnly = Boolean(input.value);
    dance.readOnly = Boolean(input.value);
  }
});

document.addEventListener("click", async event => {
  const button = event.target.closest('button[data-action^="setlist-"]');
  if (!button || setlistBusy) return;

  const action = button.dataset.action;
  setlistBusy = true;
  button.disabled = true;

  try {
    if (action === "setlist-request") {
      await openSongRequest();
    } else if (action === "setlist-refresh") {
      await refreshSetlist();
    } else {
      const url =
        `/events/${setlistEventId}/setlist/requests/${button.dataset.requestId}`;

      if (action === "setlist-vote") {
        await api(`${url}/vote`, "PUT", {
          user_id: userId,
          upvoted: button.dataset.upvoted !== "true",
        });
      } else {
        const status = {
          "setlist-played": "played",
          "setlist-remove": "removed",
          "setlist-restore": "pending",
        }[action];

        await api(url, "PATCH", { user_id: userId, status });
        toast("Set list updated.");
      }

      await refreshSetlist().catch(showSetlistSyncError);
    }
  } catch (error) {
    toast(error.message, true);
  } finally {
    setlistBusy = false;
    button.disabled = false;
  }
});

document.addEventListener("submit", async event => {
  if (event.target.id !== "setlist-request-form") return;
  event.preventDefault();
  if (setlistBusy) return;

  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  const errorMessage = document.querySelector("#request-error");

  setlistBusy = true;
  button.disabled = true;
  errorMessage.hidden = true;

  try {
    await api(`/events/${form.dataset.eventId}/setlist/requests`, "POST", {
      ...Object.fromEntries(new FormData(form)),
      user_id: userId,
    });

    modal.close();
    toast("Song requested. Your upvote is included.");
    await refreshSetlist().catch(showSetlistSyncError);
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  } finally {
    setlistBusy = false;
    button.disabled = false;
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && page === "setlist" && !modal.open && !setlistBusy) {
    refreshSetlist().catch(showSetlistSyncError);
  }
});