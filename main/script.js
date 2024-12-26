// ==UserScript==
// @name         Same Date History
// @description  Show entries for the same date in previous years in Roam Research
// @author       Your Name
// @version      1.0.0
// @match        https://roamresearch.com/*
// @grant        none
// ==/UserScript==
(async function () {
  // Wait for Roam's API to load
  while (!window.roamAlphaAPI) {
      await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Format title to match "December 26th, 2015"
  const titleFormatter = (date) => {
      const options = { year: "numeric", month: "long", day: "numeric" };
      const formatted = date.toLocaleDateString("en-US", options);
      return formatted.replace(/(\d+)/, (day) => {
          const suffix = ["th", "st", "nd", "rd"][
              (day % 100 > 10 && day % 100 < 14) || day % 10 > 3 ? 0 : day % 10
          ];
          return `${day}${suffix}`;
      });
  };

  // Add History button to valid daily note titles
  const addButtonToTitles = async () => {
      const titles = document.querySelectorAll(".rm-title-display");

      for (const titleElement of titles) {
          if (titleElement.querySelector(".history-button")) {
              continue;
          }

          const titleText = titleElement.textContent.trim();
          const parsedDate = parseNaturalDate(titleText);
          if (!parsedDate) {
              continue;
          }

          const hasHistory = await checkForHistory(parsedDate);
          if (!hasHistory) {
              continue;
          }

          const button = document.createElement("button");
          button.textContent = "History";
          button.className = "history-button";
          button.style.marginLeft = "10px";
          button.style.padding = "5px";
          button.style.background = "#007BFF";
          button.style.color = "white";
          button.style.border = "none";
          button.style.borderRadius = "3px";
          button.style.cursor = "pointer";

          button.addEventListener("click", () => {
              showPreviousYears(parsedDate);
          });

          titleElement.appendChild(button);
      }
  };

  const parseNaturalDate = (dateString) => {
      try {
          const cleanedString = dateString.replace(/(\d+)(st|nd|rd|th)/, "$1");
          return new Date(cleanedString);
      } catch (error) {
          return null;
      }
  };

  const checkForHistory = async (date) => {
      for (let i = 1; i <= 10; i++) {
          const year = date.getFullYear() - i;
          const titleToCheck = titleFormatter(new Date(year, date.getMonth(), date.getDate()));

          if (checkPageExists(titleToCheck)) {
              return true;
          }
      }

      return false;
  };

  const checkPageExists = (title) => {
      const query = `[:find ?page :where [?page :node/title "${title}"]]`;
      try {
          const results = window.roamAlphaAPI.q(query);
          return results.length > 0;
      } catch (error) {
          return false;
      }
  };

  const showPreviousYears = async (date) => {
      const results = [];

      for (let i = 1; i <= 10; i++) {
          const year = date.getFullYear() - i;
          const titleToCheck = titleFormatter(new Date(year, date.getMonth(), date.getDate()));

          const blocks = getBlocksForPage(titleToCheck);

          if (blocks.length > 0) {
              results.push({ year, blocks });
          }
      }

      displayResults(results, date);
  };

  const getBlocksForPage = (title) => {
      const query = `[:find (pull ?b [:block/string])
                      :where
                      [?p :node/title "${title}"]
                      [?b :block/page ?p]]`;
      try {
          const results = window.roamAlphaAPI.q(query).map((res) => res[0]);
          return results;
      } catch (error) {
          return [];
      }
  };

  const displayResults = (results, date) => {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "50px";
      container.style.right = "20px";
      container.style.background = "white";
      container.style.border = "1px solid black";
      container.style.padding = "15px";
      container.style.zIndex = "1000";
      container.style.maxHeight = "80vh";
      container.style.overflowY = "scroll";
      container.style.width = "300px";

      const header = document.createElement("h3");
      header.textContent = `History for ${date.toDateString()}`;
      container.appendChild(header);

      if (results.length === 0) {
          const noData = document.createElement("p");
          noData.textContent = "No previous entries found for this date.";
          container.appendChild(noData);
      } else {
          results.forEach(({ year, blocks }) => {
              const yearHeader = document.createElement("h4");
              yearHeader.textContent = `${year}`;
              container.appendChild(yearHeader);

              blocks.forEach((block) => {
                  const blockText = document.createElement("p");
                  blockText.textContent = block.string || "[Empty Block]";
                  container.appendChild(blockText);
              });
          });
      }

      const closeButton = document.createElement("button");
      closeButton.textContent = "Close";
      closeButton.style.marginTop = "10px";
      closeButton.style.padding = "5px";
      closeButton.style.background = "#DC3545";
      closeButton.style.color = "white";
      closeButton.style.border = "none";
      closeButton.style.borderRadius = "3px";
      closeButton.style.cursor = "pointer";

      closeButton.addEventListener("click", () => container.remove());
      container.appendChild(closeButton);

      document.body.appendChild(container);
  };

  setInterval(() => {
      addButtonToTitles();
  }, 1000);
})();