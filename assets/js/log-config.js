export const LOG_DELAY_MIN_MS = 100;
export const LOG_DELAY_MAX_MS = 500;

export const PAGE_LOGS = {
  index: [
    "[12:00:01] [Main Thread/INFO]: Server starting...",
    '[12:00:01] [Server thread/INFO] [FML]: Forge Mod Loader version 1.1.3 for Minecraft 1.8.31 loading',
    '[12:00:01] [Server thread/INFO] [FML]: Java is OpenJDK 64-Bit Server VM, version 1.8.0_402, running on Windows 10:amd64',
    "[12:00:19] [WeddingIO/INFO]: Generating ceremony spawn chunks...",
    "[12:01:22] [MarriageFirmCraft/INFO]: Love synchronization complete",
    '[12:00:22] [ManaMetalMod/INFO]: Loading banquet dimension: "banquet_hall"',
    "[12:01:24] [ManaMetalMod/INFO]: Preparing banquet chunks...",
    '[12:01:25] [Server thread/INFO]: Preparing level "wedding_world"',
    "[12:01:33] [Main Thread/INFO]: TPS stable at 20.0 (mean tick=49.9ms)",
    '[12:02:05] [RingCraft/WARN]: Entity Groom "Single_Status" replaced with "Married_Status"',
    '[12:02:06] [RingCraft/WARN]: Entity Bride "Single_Status" replaced with "Married_Status"',
    "[12:08:31] [Main Thread/INFO]: Server ready. Players may now join"
  ],
  rsvp: [
    '[22:21:55] [Client thread/INFO]: Connecting to Wedding Server...',
    '[22:21:55] [Client thread/INFO]: Logging in as Guest...',
    '[22:21:55] [Server thread/WARN]: No playerData found for this guest.',
    '[22:21:55] [Server thread/INFO]: Redirecting to Guest Registration...',
    '[22:21:56] [Server thread/WARN]: Disconnected: Please complete registration to generate playerdata.'
  ],
  invite: [
    "[12:00:01] [Main Thread/INFO]: playerData updated successfully",
    "[12:00:01] [Main Thread/INFO]: Sending invitation packet...",
    '[22:31:54] [WeddingNotify/INFO]: /mail compose <invitation>',
    '[22:31:54] [WeddingNotify/INFO]: /mail send <player>',
    "[12:08:31] [Main Thread/WARN]: Push failed: Missing player contact channel",
    "[22:31:55] [WeddingNotify/INFO]: Please select a delivery method to continue"
  ],
  submitted: [
    '[22:36:50] [Registry/INFO]: Player profile saved',
    '[22:36:50] [WeddingNotify/INFO]: Delivery method configured',
    '[22:36:50] [WorldMap/INFO]: Venue waypoint synced',
    '[22:36:51] [Achievement/INFO]: Guest Registered ✓'
  ]
};
