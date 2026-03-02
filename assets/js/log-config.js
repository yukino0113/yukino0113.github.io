export const LOG_DELAY_MIN_MS = 100;
export const LOG_DELAY_MAX_MS = 300;

export const PAGE_LOGS = {
  index: [
    "[12:00:01] [Main Thread/INFO]: Server starting...",
    "[12:00:01] [Main Thread/INFO]: Loading Wedding Modpack v1.1.3 on Minecraft 1.8.31",
    "[12:00:12] [Main Thread/INFO]: Checking player whitelist...",
    "[12:00:19] [WeddingIO/INFO]: Generating ceremony spawn chunks...",
    "[12:01:13] [ManaMetalMod/INFO]: Preparing banquet chunks...",
    "[12:01:22] [MarriageFirmCraft/INFO]: Love synchronization complete",
    "[12:01:23] [Main Thread/INFO]: TPS stable at 20.0",
    "[12:02:05] [RingCraft/WARN]: Entity Groom/Bride \"Single_Status\" is replaced by \"Married_Status\"",
    "[12:08:31] [Main Thread/INFO]: Server ready. Players may now join"
  ],
  rsvp: [
    "[12:00:00] [Main Thread/INFO]: Logging in as... ??",
    "[12:00:00] [Main Thread/INFO]: Loading world...",
    "[12:00:01] [Main Thread/ERROR]: Playerdata not in whitelist!",
    "[12:00:12] [Main Thread/ERROR]: Kicked from server, reason: Unknown player"
  ],
  invite: [
    "[12:00:01] [Main Thread/INFO]: Playerdata edit detected",
    "[12:00:01] [Main Thread/INFO]: Setting server push message",
    "[12:00:01] [Server/INFO]: Hello world!!",
    "[12:00:01] [Main Thread/INFO]: Sending push message",
    "[12:08:31] [Main Thread/ERROR]: Push message failed: No player contact information"
  ],
  submitted: [
    "[12:10:00] [Main Thread/INFO]: Writing whitelist profile...",
    "[12:10:01] [Main Thread/INFO]: Saving invite delivery configuration...",
    "[12:10:02] [Main Thread/INFO]: Synchronizing map waypoint...",
    "[12:10:03] [Main Thread/INFO]: Submission complete."
  ]
};
