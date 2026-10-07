const journeyEmojis: Record<string, string> = {
  ACTIVITY: "🎯",
  FOOD: "🍽️",
  FILM: "🎬",
  COOK: "🥘",
  FUN: "🎟️",
  TRANSFER: "🚌",
  SHOP: "🛍️",
  TICKET: "🎟️",
  PHONE: "📱",
  LINK: "🔗",
  EYE: "👀",
  DOWNLOAD: "📥",
  UPLOAD: "📤",
  CALENDAR: "📅",
  ADD: "➕",
  STAR: "⭐",
  ARCHIVE: "🗃️",
  PHOTO: "📸",
  INFO: "ℹ️",
  WEB: "🌐",
  EDIT: "✏️",
  CHECK: "✅",
  PENDING: "⏳",
  CANCEL: "❌",
  MONEY: "💰",
  UP: "⬆️",
  DOWN: "⬇️",
  DELETE: "🗑️",
  MAPS: "🗺️",
  OPEN: "↗️",
};

export function JourneyIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={className ? `journey-icon ${className}` : "journey-icon"} aria-hidden="true">
      {journeyEmojis[name.toUpperCase()] ?? journeyEmojis.LINK}
    </span>
  );
}
