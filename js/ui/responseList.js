import { formatDateTime, makeExcerpt } from "../utils/helpers.js";

export function renderResponseList(container, responses, selectedId, onSelect) {
  container.replaceChildren();
  const fragment = document.createDocumentFragment();

  responses.forEach((response, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "response-item";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(response.id === selectedId));
    button.dataset.responseId = response.id;

    const number = document.createElement("span");
    number.className = "response-item__number";
    number.textContent = `#${responses.length - index}`;

    const main = document.createElement("span");
    main.className = "response-item__main";

    const name = document.createElement("span");
    name.className = "response-item__name";
    name.textContent = response.name || "お名前未入力";

    const excerpt = document.createElement("span");
    excerpt.className = "response-item__excerpt";
    excerpt.textContent = makeExcerpt(response.content) || "内容未入力";

    const time = document.createElement("time");
    time.className = "response-item__time";
    time.dateTime = response.submittedAt;
    time.textContent = formatDateTime(response.submittedAt);

    main.append(name, excerpt, time);
    button.append(number, main);
    button.addEventListener("click", () => onSelect(response.id));
    fragment.appendChild(button);
  });
  container.appendChild(fragment);
}

export function updateSelectedResponse(container, selectedId) {
  container.querySelectorAll(".response-item").forEach((item) => {
    item.setAttribute("aria-selected", String(item.dataset.responseId === selectedId));
  });
}
