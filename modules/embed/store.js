const drafts = new Map();
const TTL_MS = 15 * 60 * 1000;

function createDraft(userId) {
  return {
    draft: {
      title: "",
      description: "",
      color: "#556b2f",
      footer: "",
      imageUrl: "",
      thumbnailUrl: ""
    },
    channelId: null,
    channelPage: 0,
    mention: "none",
    ownerId: userId,
    expiresAt: Date.now() + TTL_MS
  };
}

function getDraft(userId) {
  const state = drafts.get(userId);
  if (!state) return null;
  if (Date.now() > state.expiresAt) {
    drafts.delete(userId);
    return null;
  }
  return state;
}

function setDraft(userId, state) {
  state.expiresAt = Date.now() + TTL_MS;
  drafts.set(userId, state);
  return state;
}

function clearDraft(userId) {
  drafts.delete(userId);
}

module.exports = { createDraft, getDraft, setDraft, clearDraft };
