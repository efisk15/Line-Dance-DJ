// This file holds error checking helper functions to verify
// user request data is correct.

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function integer(value, label, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value === "string" && value.trim() !== "") {
    value = Number(value);
  }

  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new AppError(
      `${label} must be a whole number between ${min} and ${max}.`,
    );
  }

  return value;
}

function optionalInteger(value, label, min, max) {
  if (value == null || value === "") {
    return null;
  }

  return integer(value, label, min, max);
}

function text(value, label, max = 150, optional = false) {
  if (optional && (value == null || value === "")) {
    return "";
  }

  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed || trimmed.length > max) {
    throw new AppError(`${label} must be between 1 and ${max} characters.`);
  }

  return trimmed;
}

const difficulties = ["beginner", "improver", "intermediate", "advanced"];

function danceInput(body) {
  const name = text(body.dance_name, "Dance name");
  const song = text(body.song_name, "Song name");
  const difficulty = body.difficulty;

  if (!difficulties.includes(difficulty)) {
    throw new AppError("Choose a valid difficulty.");
  }

  const bpm = optionalInteger(body.tempo_bpm, "Tempo", 1, 400);
  const url = text(body.choreography_url, "Choreography URL", 1000, true);

  if (url) {
    let protocol;

    try {
      protocol = new URL(url).protocol;
    } catch {
      throw new AppError("Enter a valid choreography URL.");
    }

    if (protocol !== "http:" && protocol !== "https:") {
      throw new AppError("Choreography links must use HTTP or HTTPS.");
    }
  }

  return [name, song, difficulty, bpm, url || null];
}

function eventInput(body) {
  const name = text(body.event_name, "Event name");
  const venue = integer(body.venue_id, "Venue ID");
  const dj = integer(body.dj_user_profile_id, "DJ ID");
  const start = text(body.starts_at, "Start time", 20);

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)) {
    throw new AppError("Choose a valid event date and time.");
  }

  const date = new Date(`${start}:00Z`);

  // Date can roll an invalid day, like February 30, into the next month.
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 1900 ||
    date.toISOString().slice(0, 16) !== start
  ) {
    throw new AppError("Choose a valid event date and time.");
  }

  return [name, venue, dj, `${start.replace("T", " ")}:00`];
}

function profileInput(body) {
  const name = text(body.display_name, "Display name");
  const email = text(body.email, "Email", 254).toLowerCase();
  const role = body.role;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Enter a valid email address.");
  }

  if (!["attendee", "dj", "admin"].includes(role)) {
    throw new AppError("Choose attendee, DJ, or admin.");
  }

  return [name, email, role];
}

function stateCode(value, optional = false) {
  const state = text(value, "State", 2, optional).toUpperCase();

  if (state && !/^[A-Z]{2}$/.test(state)) {
    throw new AppError(
      "Use a two-letter state abbreviation, such as TN or AL.",
    );
  }

  return state;
}

function venueInput(body) {
  return [
    text(body.name, "Venue name"),
    text(body.address, "Street address", 250),
    text(body.city, "City", 100),
    stateCode(body.state),
    optionalInteger(body.capacity, "Capacity", 1, 1000000),
  ];
}

module.exports = {
  AppError,
  integer,
  text,
  difficulties,
  danceInput,
  eventInput,
  profileInput,
  venueInput,
  stateCode,
};
