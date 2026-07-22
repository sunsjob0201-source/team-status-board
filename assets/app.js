const STATUS_CLASS = {
  "未着手": "not-started",
  "作業中": "in-progress",
  "確認待ち": "waiting",
  "完了": "completed",
};

const elements = {
  announcement: document.querySelector("#announcement"),
  announcementText: document.querySelector("#announcement-text"),
  memberCount: document.querySelector("#member-count"),
  completedCount: document.querySelector("#completed-count"),
  loading: document.querySelector("#loading"),
  emptyState: document.querySelector("#empty-state"),
  errorState: document.querySelector("#error-state"),
  memberList: document.querySelector("#member-list"),
};

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createMemberCard(member) {
  const statusClass = STATUS_CLASS[member.status];
  const article = document.createElement("article");
  article.className = `member-card member-card-${statusClass}`;

  const top = document.createElement("div");
  top.className = "member-card-top";

  const identity = document.createElement("div");
  identity.className = "member-identity";

  const initial = createTextElement("div", "member-initial", Array.from(member.name)[0] || "-");
  initial.setAttribute("aria-hidden", "true");

  const headingGroup = document.createElement("div");
  headingGroup.append(
    createTextElement("h3", "member-name", member.name),
    createTextElement("p", "member-role", member.role),
  );
  identity.append(initial, headingGroup);

  const badge = createTextElement("span", `status-badge status-${statusClass}`, member.status);
  top.append(identity, badge);

  const message = document.createElement("div");
  message.className = "member-message";
  message.append(
    createTextElement("span", "message-label", "ひとこと"),
    createTextElement("p", "message-text", member.message),
  );

  article.append(top, message);
  return article;
}

function isValidData(data) {
  return data
    && typeof data === "object"
    && typeof data.announcement === "string"
    && Array.isArray(data.members)
    && data.members.every((member) => (
      member
      && typeof member.name === "string"
      && typeof member.role === "string"
      && typeof member.message === "string"
      && Object.hasOwn(STATUS_CLASS, member.status)
    ));
}

function render(data) {
  const announcement = data.announcement.trim();
  if (announcement) {
    elements.announcementText.textContent = announcement;
    elements.announcement.hidden = false;
  }

  const members = [...data.members].sort((a, b) => a.name.localeCompare(b.name, "ja"));
  elements.memberCount.textContent = String(members.length);
  elements.completedCount.textContent = String(members.filter((member) => member.status === "完了").length);

  if (members.length === 0) {
    elements.emptyState.hidden = false;
    return;
  }

  const fragment = document.createDocumentFragment();
  members.forEach((member) => fragment.append(createMemberCard(member)));
  elements.memberList.append(fragment);
}

async function loadBoard() {
  try {
    const response = await fetch("./data.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!isValidData(data)) {
      throw new Error("データの形式が正しくありません");
    }

    render(data);
  } catch (error) {
    console.error("Team Status Boardの読み込みに失敗しました:", error);
    elements.memberCount.textContent = "—";
    elements.completedCount.textContent = "—";
    elements.errorState.hidden = false;
  } finally {
    elements.loading.hidden = true;
  }
}

loadBoard();
