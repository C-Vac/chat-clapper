import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Save,
  Trash2,
  Settings,
  BarChart2,
  List,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Search,
  XCircle,
  CheckSquare,
  CornerDownLeft,
  Info,
  X,
  Target,
  Ban,
  MousePointerClick,
  Sparkles,
  ClipboardList,
  Plus, // Added for iterative content sampling button
} from "lucide-react";

// Define types
type Config = {
  global: { replacementText: string; delaySeconds: number };
  sites: Record<
    string,
    {
      label?: string;
      users: string[];
      selectors: { container: string; author: string; content: string };
    }
  >;
};
type BlockedMessage = {
  id: number;
  timestamp: number;
  author: string;
  originalContent?: string;
  clappedContent: string;
  site?: string;
};

type InferredSelectorValues = {
  container: string;
  author: string;
  content: string;
};
type Props = {
  getConfig: () => Promise<Config>;
  setConfig: (config: Config) => Promise<void>;
  getMessageHistory: (limit?: number) => Promise<BlockedMessage[]>;
};

type SampleElementInfo = {
  id: string;
  originalId?: string | null;
  selectorPath: string;
  textPreview: string;
};

// CollapsibleSection component
const CollapsibleSection: React.FC<{
  title: string;
  icon?: React.ReactNode;
  initiallyCollapsed?: boolean;
  children: React.ReactNode;
  onToggle?: (isCollapsed: boolean) => void;
  headerClassName?: string;
  contentClassName?: string;
}> = React.memo(
  ({
    title,
    icon,
    initiallyCollapsed = false,
    children,
    onToggle,
    headerClassName = "",
    contentClassName = "",
  }) => {
    const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
    const handleToggle = () => {
      setIsCollapsed(!isCollapsed);
      if (onToggle) {
        onToggle(!isCollapsed);
      }
    };
    return (
      <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden bg-white">
        <div
          className={`flex justify-between items-center p-3 md:p-4 cursor-pointer hover:bg-gray-100 transition-colors ${headerClassName}`}
          onClick={handleToggle}
        >
          <div className="flex items-center">
            {icon && <span className="mr-2 text-gray-600">{icon}</span>}
            <span className="font-medium text-gray-700 text-lg">{title}</span>
          </div>
          <span className="text-gray-600">
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </span>
        </div>
        {!isCollapsed && (
          <div className={`p-4 md:p-5 bg-white ${contentClassName}`}>
            {children}
          </div>
        )}
      </div>
    );
  }
);
CollapsibleSection.displayName = "CollapsibleSection";

// generateCandidateSelector FOR CONTAINER
const generateCandidateSelectorForContainer = (
  element: Element,
  scopeElement: Document | Element | null,
  existingSelectorsInList: Set<string>
): { selector: string; uniqueInScope: boolean } | null => {
  const doc = element.ownerDocument;
  scopeElement = scopeElement || doc;

  if (
    element.id &&
    element.id.trim() !== "" &&
    !element.id.startsWith("cc-sample-")
  ) {
    const selector = `#${CSS.escape(element.id)}`;
    if (!existingSelectorsInList.has(selector)) {
      try {
        if (scopeElement.querySelectorAll(selector).length === 1) {
          return { selector, uniqueInScope: true };
        }
      } catch {
        /* empty */
      }
    }
  }

  const tagName = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter(
      (c) =>
        c &&
        !c.includes(":") &&
        !/^\d/.test(c) &&
        CSS.supports("selector(." + CSS.escape(c) + ")") &&
        !c.startsWith("cc-") &&
        c !== "data-ch-highlighted"
    )
    .map((c) => `.${CSS.escape(c)}`)
    .join("");

  if (classes && classes.length > 0) {
    const selector = tagName + classes;
    if (!existingSelectorsInList.has(selector)) {
      try {
        const elementsFound = scopeElement.querySelectorAll(selector);
        if (elementsFound.length === 1)
          return { selector, uniqueInScope: true };
        if (elementsFound.length > 0) return { selector, uniqueInScope: false };
      } catch {
        /* empty */
      }
    }
  }

  if (element.classList.length > 0) {
    for (const singleClass of Array.from(element.classList)) {
      if (
        singleClass &&
        !singleClass.includes(":") &&
        !/^\d/.test(singleClass) &&
        CSS.supports("selector(." + CSS.escape(singleClass) + ")") &&
        !singleClass.startsWith("cc-") &&
        singleClass !== "data-ch-highlighted"
      ) {
        const selector = `${tagName}.${CSS.escape(singleClass)}`;
        if (!existingSelectorsInList.has(selector)) {
          try {
            const elementsFound = scopeElement.querySelectorAll(selector);
            if (elementsFound.length === 1)
              return { selector, uniqueInScope: true };
            if (elementsFound.length > 0)
              return { selector, uniqueInScope: false };
          } catch {
            /* empty */
          }
        }
      }
    }
  }

  if (element.classList.length > 0) {
    for (const singleClass of Array.from(element.classList)) {
      if (
        singleClass &&
        !singleClass.includes(":") &&
        !/^\d/.test(singleClass) &&
        CSS.supports("selector(." + CSS.escape(singleClass) + ")") &&
        !singleClass.startsWith("cc-") &&
        singleClass !== "data-ch-highlighted"
      ) {
        const selector = `.${CSS.escape(singleClass)}`;
        if (!existingSelectorsInList.has(selector)) {
          try {
            const searchScope =
              scopeElement === doc || !scopeElement ? doc : scopeElement;
            if (searchScope.querySelectorAll(selector).length === 1)
              return { selector, uniqueInScope: true };
          } catch {
            /* empty */
          }
        }
      }
    }
  }

  if (
    !existingSelectorsInList.has(tagName) &&
    !["div", "span", "p"].includes(tagName) // Avoid overly generic tags for container inference
  ) {
    try {
      const elementsFound = scopeElement.querySelectorAll(tagName);
      if (elementsFound.length === 1)
        return { selector: tagName, uniqueInScope: true };
      if (elementsFound.length > 0)
        return { selector: tagName, uniqueInScope: false };
    } catch {
      /* empty */
    }
  }
  return null;
};

const scoreContainerCandidate = (
  candidate: { selector: string; uniqueInScope: boolean },
  element: Element
): number => {
  let score = 0;
  const selector = candidate.selector.toLowerCase();
  const classText =
    element.className && typeof element.className === "string"
      ? element.className.toLowerCase()
      : "";
  const idText = element.id ? element.id.toLowerCase() : "";
  const ariaLabelText = element.getAttribute("aria-label")?.toLowerCase() || "";
  const roleText = element.getAttribute("role")?.toLowerCase() || "";
  const keywords = [
    "chat",
    "messages",
    "log",
    "feed",
    "stream",
    "conversation",
    "thread",
    "comments",
    "track",
    "history",
    "list",
    "items",
    "scroller",
    "content",
    "container",
    "wrapper",
    "main",
  ];
  if (candidate.uniqueInScope) score += 100;
  if (selector.startsWith("#")) score += 75;
  let keywordFoundInAttributes = false;
  for (const keyword of keywords) {
    if (
      idText.includes(keyword) ||
      classText.includes(keyword) ||
      ariaLabelText.includes(keyword) ||
      roleText.includes(keyword)
    ) {
      score += 60;
      keywordFoundInAttributes = true;
      break;
    }
  }
  if (!keywordFoundInAttributes && keywords.some((k) => selector.includes(k)))
    score += 30;
  score += Math.min(element.childElementCount * 3, 45);
  score += Math.min((element.textContent || "").trim().length / 10, 40);
  if (!selector.startsWith("#")) {
    score -= candidate.selector.length * 0.7;
    if (candidate.selector.split(".").length > 4) score -= 30;
    if (candidate.selector.split(">").length > 2) score -= 25;
  } else {
    score -= candidate.selector.length * 0.3;
  }
  const itemKeywords = ["item", "message", "entry", "row", "post", "comment"];
  if (
    itemKeywords.some((k) => classText.includes(k) || idText.includes(k)) &&
    element.childElementCount < 3 // If it looks like an item itself, penalize as a container
  )
    score -= 70;

  if (
    !keywordFoundInAttributes &&
    !keywords.some((k) => selector.includes(k))
  ) {
    const tagName = element.tagName.toLowerCase();
    if (["ul", "ol", "dl"].includes(tagName)) score += 15;
    if (tagName === "section" || tagName === "article" || tagName === "main")
      score += 20;
  }
  return score;
};

function generateSelectorsForElement(
  element: Element,
  scope: Element // Scope is usually the containerElement for author/content
): string[] {
  const selectors: Set<string> = new Set();
  const doc = element.ownerDocument;

  if (element.id && !element.id.startsWith("cc-sample-")) {
    const idSelector = `#${CSS.escape(element.id)}`;
    try {
      if (scope.querySelectorAll(idSelector).length === 1)
        selectors.add(idSelector);
      else if (doc.querySelectorAll(idSelector).length === 1)
        selectors.add(idSelector);
    } catch {
      /*ignore*/
    }
  }

  const tagName = element.tagName.toLowerCase();
  const isValidClass = (c: string) =>
    c &&
    !c.includes(":") &&
    !/^\d/.test(c) &&
    CSS.supports(`selector(.${CSS.escape(c)})`) &&
    !c.startsWith("cc-") &&
    c !== "data-ch-highlighted" &&
    !c.startsWith("original-border-style-");

  const allClasses = Array.from(element.classList)
    .filter(isValidClass)
    .map((c) => `.${CSS.escape(c)}`)
    .join("");
  if (allClasses) selectors.add(tagName + allClasses);

  element.classList.forEach((c) => {
    if (isValidClass(c)) {
      const classSelector = `.${CSS.escape(c)}`;
      try {
        if (scope.querySelectorAll(classSelector).length === 1)
          selectors.add(classSelector);
      } catch {
        /*ignore*/
      }
      selectors.add(`${tagName}${classSelector}`);
    }
  });

  if (
    allClasses &&
    Array.from(element.classList).filter(isValidClass).length > 1
  ) {
    try {
      if (scope.querySelectorAll(allClasses).length === 1)
        selectors.add(allClasses);
    } catch {
      /*ignore*/
    }
  }

  const PREFERRED_ATTRIBUTES = [
    "data-testid",
    "data-test-id",
    "data-test",
    "data-cy",
    "data-qa",
    "role",
    "name",
    "aria-label",
    "aria-labelledby",
    "title",
  ];
  for (const attrName of PREFERRED_ATTRIBUTES) {
    const attrValue = element.getAttribute(attrName);
    if (attrValue && attrValue.trim() !== "") {
      const attrSelectorWithTag = `${tagName}[${attrName}="${CSS.escape(
        attrValue
      )}"]`;
      try {
        if (scope.querySelectorAll(attrSelectorWithTag).length === 1)
          selectors.add(attrSelectorWithTag);
        else if (scope.querySelectorAll(attrSelectorWithTag).length <= 3)
          selectors.add(attrSelectorWithTag);
      } catch {
        /*ignore*/
      }

      const attrSelectorNoTag = `[${attrName}="${CSS.escape(attrValue)}"]`;
      if (
        attrName.startsWith("data-test") ||
        attrName === "data-cy" ||
        attrName === "data-qa" ||
        attrName === "role"
      ) {
        try {
          if (scope.querySelectorAll(attrSelectorNoTag).length === 1)
            selectors.add(attrSelectorNoTag);
          else if (scope.querySelectorAll(attrSelectorNoTag).length <= 3)
            selectors.add(attrSelectorNoTag);
        } catch {
          /*ignore*/
        }
      }
    }
  }

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (
      attr.name.startsWith("data-") &&
      !PREFERRED_ATTRIBUTES.includes(attr.name)
    ) {
      if (attr.value && attr.value.trim() !== "") {
        const attrSelector = `${tagName}[${attr.name}="${CSS.escape(
          attr.value
        )}"]`;
        try {
          if (scope.querySelectorAll(attrSelector).length <= 5)
            selectors.add(attrSelector);
        } catch {
          /*ignore*/
        }
      }
    }
  }

  if (
    !["div", "span", "p", "li", "a", "i", "b", "strong", "em"].includes(tagName)
  ) {
    try {
      if (scope.querySelectorAll(tagName).length <= 10) selectors.add(tagName);
    } catch {
      /*ignore*/
    }
  } else if (
    element.childElementCount === 0 &&
    (element.textContent || "").trim().length > 0
  ) {
    try {
      if (scope.querySelectorAll(tagName).length <= 15) selectors.add(tagName);
    } catch {
      /*ignore*/
    }
  }

  return Array.from(selectors).filter((s) => s.length > 0);
}

const findBestCommonSelectorUtil = (
  samples: SampleElementInfo[],
  type: "author" | "content",
  iframeDoc: Document,
  containerElement: Element,
  _denylistedSelectors: Set<string>,
  currentAuthorSelector?: string // For content pattern matching
): {
  bestSelector: string;
  allSampleSelectors: string[];
  confidence: number;
} => {
  const sampleElements = samples
    .map((s) => {
      try {
        const el = iframeDoc.getElementById(s.id);
        return el;
      } catch {
        return null;
      }
    })
    .filter(
      (el): el is HTMLElement => el !== null && containerElement.contains(el)
    );

  if (sampleElements.length === 0) {
    return { bestSelector: "", allSampleSelectors: [], confidence: -Infinity };
  }

  const selectorsPerSample: string[][] = sampleElements.map((el) =>
    generateSelectorsForElement(el, containerElement)
  );

  const allPossibleSelectors = new Set<string>();
  selectorsPerSample.forEach((list) =>
    list.forEach((s) => allPossibleSelectors.add(s))
  );

  let commonSelectors: string[] = [];
  if (selectorsPerSample.length > 0 && selectorsPerSample[0]) {
    commonSelectors = [...new Set(selectorsPerSample[0])];
    for (let i = 1; i < selectorsPerSample.length; i++) {
      if (!selectorsPerSample[i]) {
        commonSelectors = [];
        break;
      }
      const currentSampleSet = new Set(selectorsPerSample[i]);
      commonSelectors = commonSelectors.filter((selector) =>
        currentSampleSet.has(selector)
      );
      if (commonSelectors.length === 0) break;
    }
  }

  let bestSelector = "";
  let bestScore = -Infinity;

  if (commonSelectors.length > 0) {
    commonSelectors.forEach((selector) => {
      try {
        const matchesInContainer = Array.from(
          containerElement.querySelectorAll(selector)
        );
        const allSamplesMatchedByThisSelector = sampleElements.every((se) =>
          matchesInContainer.includes(se)
        );

        if (
          allSamplesMatchedByThisSelector &&
          matchesInContainer.length >= sampleElements.length
        ) {
          let score = 0;
          if (matchesInContainer.length === sampleElements.length)
            score += 1000;
          else
            score -=
              (matchesInContainer.length - sampleElements.length) *
              (type === "content" ? 20 : 15);

          if (selector.startsWith("#") && !selector.includes("cc-sample-"))
            score += 100;
          else if (selector.includes("[")) {
            score += 80;
            if (selector.match(/data-(testid|test-id|test|cy|qa)/i))
              score += 60;
            else if (selector.includes("role=")) score += 40;
            else if (selector.includes("name=")) score += 30;
            else if (selector.includes("aria-label=")) score += 20;
            if (
              !selector.startsWith(
                sampleElements[0].tagName.toLowerCase() + "["
              )
            )
              score += 15;
          } else if (selector.startsWith(".")) {
            score += 25 + (selector.split(".").length - 1) * 10;
            if (
              !selector.startsWith(
                sampleElements[0].tagName.toLowerCase() + "."
              )
            )
              score += 5;
          } else if (/^[a-z]+$/.test(selector)) {
            const genericTags = [
              "div",
              "span",
              "p",
              "a",
              "li",
              "i",
              "b",
              "strong",
              "em",
            ];
            const semanticContainerTags = [
              "article",
              "section",
              "aside",
              "nav",
              "main",
              "header",
              "footer",
              "ul",
              "ol",
              "dl",
              "figure",
              "figcaption",
            ];
            if (genericTags.includes(selector))
              score -= type === "content" ? 80 : 70;
            else if (semanticContainerTags.includes(selector)) score -= 40;
            else score -= 20;
          }
          score -= selector.length * 1.0;
          const selectorComplexity = selector
            .split(/([.#>+~ ])/)
            .filter(
              (p) =>
                p.trim() && ![".", "#", ">", "+", "~", " "].includes(p.trim())
            ).length;
          if (selectorComplexity > 4) score -= (selectorComplexity - 4) * 15;
          else if (selectorComplexity === 1 && /^[a-z]+$/.test(selector))
            score -= 20;

          // Content Pattern Matching / Adjacency Logic
          if (type === "content" && currentAuthorSelector) {
            let patternBonus = 0;
            try {
              const authorMatches = Array.from(
                containerElement.querySelectorAll(currentAuthorSelector)
              );
              if (authorMatches.length > 0) {
                let numPairedAuthors = 0;
                let numAuthorsWithMultipleContents = 0;
                let numAuthorsWithNoContents = 0;

                authorMatches.forEach((authorEl) => {
                  let associatedContentCount = 0;
                  let nextSibling = authorEl.nextElementSibling;
                  while (nextSibling) {
                    if (nextSibling.matches(currentAuthorSelector!)) break; // Stop if we hit another author
                    if (nextSibling.matches(selector)) {
                      associatedContentCount++;
                    }
                    // Consider if content is a child of a sibling wrapper
                    else if (
                      nextSibling.querySelector(selector) &&
                      !nextSibling.querySelector(currentAuthorSelector!)
                    ) {
                      // Ensure this sibling wrapper itself doesn't also contain an author
                      // to avoid matching content from a different author's "message item"
                      const elToCheck = nextSibling.querySelector(selector);
                      if (
                        elToCheck &&
                        elToCheck.closest(currentAuthorSelector!) === null
                      ) {
                        // Check if content is "closer" to this author than any other potential author within nextSibling
                        let tempParent = elToCheck.parentElement;
                        let foundOtherAuthorCloser = false;
                        while (tempParent && tempParent !== containerElement) {
                          if (
                            tempParent.matches(currentAuthorSelector!) &&
                            tempParent !== authorEl
                          ) {
                            foundOtherAuthorCloser = true;
                            break;
                          }
                          if (
                            Array.from(tempParent.children).some(
                              (child) =>
                                child !== elToCheck &&
                                child.matches(currentAuthorSelector!) &&
                                child !== authorEl
                            )
                          ) {
                            // foundOtherAuthorCloser = true; break; // More complex check if needed
                          }
                          tempParent = tempParent.parentElement;
                        }
                        if (!foundOtherAuthorCloser) associatedContentCount++;
                      }
                    }
                    nextSibling = nextSibling.nextElementSibling;
                  }

                  if (associatedContentCount === 1) numPairedAuthors++;
                  else if (associatedContentCount > 1)
                    numAuthorsWithMultipleContents++;
                  else numAuthorsWithNoContents++;
                });

                if (authorMatches.length > 0) {
                  patternBonus +=
                    (numPairedAuthors / authorMatches.length) * 300;
                  patternBonus -=
                    (numAuthorsWithMultipleContents / authorMatches.length) *
                    200;
                  patternBonus -=
                    (numAuthorsWithNoContents / authorMatches.length) * 150;
                }
                score += patternBonus;

                // Penalties
                if (currentAuthorSelector === selector) {
                  score -= 300; // Penalize if content selector is identical to author
                }
                let contentAlsoMatchesAuthorSel = 0;
                matchesInContainer.forEach((contentMatchEl) => {
                  if (contentMatchEl.matches(currentAuthorSelector!)) {
                    contentAlsoMatchesAuthorSel++;
                  }
                });
                if (
                  contentAlsoMatchesAuthorSel > 0 &&
                  matchesInContainer.length > 0
                ) {
                  score -=
                    (contentAlsoMatchesAuthorSel / matchesInContainer.length) *
                    150;
                }
              }
            } catch (e) {
              console.warn("Error during content pattern matching:", e);
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestSelector = selector;
          }
        }
      } catch (e) {
        console.warn(`Error testing selector ${selector} for ${type}:`, e);
      }
    });
  }
  const isValidClass = (c: string) =>
    c &&
    !c.includes(":") &&
    !/^\d/.test(c) &&
    CSS.supports(`selector(.${CSS.escape(c)})`) &&
    !c.startsWith("cc-") &&
    c !== "data-ch-highlighted" &&
    !c.startsWith("original-border-style-");

  if (
    (!bestSelector || bestScore < (type === "content" ? 100 : 50)) &&
    sampleElements.length > 0
  ) {
    const getCommonClasses = (els: HTMLElement[]): string[] => {
      if (!els || els.length === 0) return [];
      const classLists = els.map(
        (el) => new Set(Array.from(el.classList).filter((c) => isValidClass(c)))
      );
      if (classLists.length === 0 || classLists.every((cl) => cl.size === 0))
        return [];
      let common = new Set(classLists.find((cl) => cl.size > 0) || []);
      for (let i = 0; i < classLists.length; i++) {
        if (classLists[i].size === 0 && els.length > 1) continue;
        common = new Set([...common].filter((cls) => classLists[i].has(cls)));
        if (common.size === 0) break;
      }
      return Array.from(common);
    };

    const commonCls = getCommonClasses(sampleElements);
    if (commonCls.length > 0) {
      const classSelectorAttempt = commonCls
        .map((c) => `.${CSS.escape(c)}`)
        .join("");
      const firstSampleTagName = sampleElements[0].tagName.toLowerCase();
      const attempts = [classSelectorAttempt];
      if (
        !["div", "span", "p"].includes(firstSampleTagName) ||
        commonCls.length > 1
      ) {
        attempts.push(firstSampleTagName + classSelectorAttempt);
      }

      for (const attempt of attempts) {
        try {
          const matchesInContainer = Array.from(
            containerElement.querySelectorAll(attempt)
          );
          const allSamplesMatchedByThisSelector = sampleElements.every((se) =>
            matchesInContainer.includes(se)
          );

          if (
            allSamplesMatchedByThisSelector &&
            matchesInContainer.length >= sampleElements.length
          ) {
            let score = 200;
            score += commonCls.length * 30;
            if (matchesInContainer.length === sampleElements.length)
              score += 500;
            else
              score -= (matchesInContainer.length - sampleElements.length) * 30;
            score -= attempt.length * 1.5;
            if (attempt.startsWith(firstSampleTagName)) score += 10;

            // Apply pattern matching for content here too if fallback is used
            if (type === "content" && currentAuthorSelector) {
              // Simplified repetition of pattern logic for fallback
              let patternBonus = 0;
              const authorMatches = Array.from(
                containerElement.querySelectorAll(currentAuthorSelector)
              );
              if (authorMatches.length > 0) {
                let numPairedAuthors = 0;
                authorMatches.forEach((authorEl) => {
                  let associatedContentCount = 0;
                  let nextSibling = authorEl.nextElementSibling;
                  while (nextSibling) {
                    if (nextSibling.matches(currentAuthorSelector!)) break;
                    if (nextSibling.matches(attempt)) associatedContentCount++;
                    nextSibling = nextSibling.nextElementSibling;
                  }
                  if (associatedContentCount === 1) numPairedAuthors++;
                });
                patternBonus += (numPairedAuthors / authorMatches.length) * 150; // Lower bonus for fallback
                score += patternBonus;
              }
            }

            if (score > bestScore) {
              bestScore = score;
              bestSelector = attempt;
            }
          }
        } catch {
          /* ignore invalid selector */
        }
      }
    }
  }
  return {
    bestSelector,
    allSampleSelectors: Array.from(allPossibleSelectors).sort(
      (a, b) => a.length - b.length
    ),
    confidence: bestScore,
  };
};

const Dashboard: React.FC<Props> = ({ getConfig, setConfig, getMessageHistory }) => {
  const [config, setConfigState] = useState<Config | null>(null);
  const [draftConfig, setDraftConfig] = useState<Config | null>(null);
  const [blockedMessages, setBlockedMessages] = useState<BlockedMessage[]>([]);
  const [stats, setStats] = useState({
    siteCount: 0,
    uniqueUsers: 0,
    topUsers: [] as { name: string; count: number }[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<{
    type: "error" | "success" | "info";
    message: string;
  } | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({
    globalSettings: false,
    siteManagement: false,
    statistics: false,
    messageLog: false,
  });
  const [selectedSiteKey, setSelectedSiteKey] = useState<string | null>(null);
  const [newSitePattern, setNewSitePattern] = useState("");

  const [activeHelperSiteKey, setActiveHelperSiteKey] = useState<string | null>(
    null
  );
  const [helperHtmlInput, setHelperHtmlInput] = useState<string>("");
  const [helperSelectors, setHelperSelectors] =
    useState<InferredSelectorValues>({
      container: "",
      author: "",
      content: "",
    });
  const [isContainerConfirmed, setIsContainerConfirmed] =
    useState<boolean>(false);
  const [incorrectHelperFields, setIncorrectHelperFields] = useState<
    Partial<Record<keyof InferredSelectorValues, boolean>>
  >({});
  const helperPreviewIframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoadHandlerRef = useRef<(() => void) | null>(null);
  const iframeClickHandlerRef = useRef<((event: MouseEvent) => void) | null>(
    null
  );

  const [currentCandidates, setCurrentCandidates] = useState<{
    field: "container";
    list: Array<{
      selector: string;
      textPreview: string;
      uniqueInScope: boolean;
      score: number;
    }>;
  } | null>(null);
  const [denylistedHelperSelectors, setDenylistedHelperSelectors] = useState<
    Set<string>
  >(new Set());

  const [authorSamples, setAuthorSamples] = useState<SampleElementInfo[]>([]);
  const [contentSamples, setContentSamples] = useState<SampleElementInfo[]>([]);
  const [currentSamplingTarget, setCurrentSamplingTarget] = useState<
    "author" | "content" | null
  >(null);
  const [nextSampleIndex, setNextSampleIndex] = useState(0);

  const MAX_INITIAL_SAMPLES = 2;
  const ABSOLUTE_MAX_CONTENT_SAMPLES = 5;
  const [canAddMoreContentSamples, setCanAddMoreContentSamples] =
    useState(false);

  const [autoHighlightInferred, setAutoHighlightInferred] = useState(true);

  const [rawAuthorSelectors, setRawAuthorSelectors] = useState<string[]>([]);
  const [rawContentSelectors, setRawContentSelectors] = useState<string[]>([]);

  const showUserMessage = useCallback(
    (type: "error" | "success" | "info", message: string, duration = 5000) => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
      setUserMessage({ type, message });
      messageTimeoutRef.current = setTimeout(() => {
        setUserMessage(null);
        messageTimeoutRef.current = null;
      }, duration);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, []);

  const updateStats = useCallback(
    (currentConfig: Config | null, currentMessages: BlockedMessage[]) => {
      if (!currentConfig) return;
      const siteCount = Object.keys(currentConfig.sites).length;
      const userCounts = currentMessages.reduce((acc, msg) => {
        acc[msg.author] = (acc[msg.author] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const uniqueUsers = Object.keys(userCounts).length;
      const topUsers = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3) // Show top 3
        .map(([name, count]) => ({ name, count }));
      setStats({ siteCount, uniqueUsers, topUsers });
    },
    []
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const cfg = await getConfig();
        setConfigState(cfg);
        setDraftConfig(JSON.parse(JSON.stringify(cfg)));
        const msgs = await getMessageHistory(10);
        setBlockedMessages(msgs);
        updateStats(cfg, msgs);
        const siteKeys = Object.keys(cfg.sites);
        setSelectedSiteKey(siteKeys.length > 0 ? siteKeys[0] : null);
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError(
          "Failed to load initial data. Please check console and try refreshing."
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [getConfig, getMessageHistory, updateStats]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleBlocked = async (_event?: Event) => {
      try {
        const msgs = await getMessageHistory(10);
        setBlockedMessages(msgs);
        if (config) updateStats(config, msgs);
      } catch (err) {
        console.error("Failed to update blocked messages:", err);
        showUserMessage("error", "Could not refresh blocked messages.");
      }
    };
    window.addEventListener(
      "chatClapperMessageBlocked",
      handleBlocked as EventListener
    );
    return () =>
      window.removeEventListener(
        "chatClapperMessageBlocked",
        handleBlocked as EventListener
      );
  }, [config, getMessageHistory, showUserMessage, updateStats]);

  useEffect(() => {
    const iframe = helperPreviewIframeRef.current;
    if (!iframe) return;
    const iframeDoc = iframe.contentDocument;

    const removeClickListener = () => {
      if (iframeDoc && iframeClickHandlerRef.current) {
        iframeDoc.body.removeEventListener(
          "click",
          iframeClickHandlerRef.current
        );
        iframeDoc.body.style.cursor = "default";
        iframeClickHandlerRef.current = null;
      }
    };

    const performLoadActions = () => {
      if (!iframeDoc?.body) return;

      iframeDoc
        .querySelectorAll<HTMLElement>("[data-ch-highlighted]")
        .forEach((el) => {
          el.style.backgroundColor = "";
          el.style.outline = "";
          el.style.outlineOffset = "";
          el.removeAttribute("data-ch-highlighted");
          el.style.border = el.dataset.originalBorderStyle || "";
          if (el.dataset.originalBorderStyle)
            delete el.dataset.originalBorderStyle;
        });

      const allPersistedSamples = [...authorSamples, ...contentSamples].filter(
        (s) => s && s.id
      );

      allPersistedSamples.forEach((sampleInfo) => {
        try {
          const el = iframeDoc.getElementById(sampleInfo.id);
          if (el) {
            if (!el.dataset.originalBorderStyle) {
              el.dataset.originalBorderStyle = el.style.border || "";
            }
            let currentBorderColor = "";
            if (
              currentSamplingTarget === "author" &&
              authorSamples.length > nextSampleIndex && // Check if nextSampleIndex is valid for replacement
              authorSamples[nextSampleIndex]?.id === sampleInfo.id
            ) {
              currentBorderColor = "orange";
            } else if (
              currentSamplingTarget === "content" &&
              contentSamples.length > nextSampleIndex && // Check if nextSampleIndex is valid for replacement
              contentSamples[nextSampleIndex]?.id === sampleInfo.id
            ) {
              currentBorderColor = "orange";
            } else if (authorSamples.some((s) => s.id === sampleInfo.id)) {
              currentBorderColor = "blue";
            } else if (contentSamples.some((s) => s.id === sampleInfo.id)) {
              currentBorderColor = "green";
            }

            if (currentBorderColor) {
              el.style.border = `2px dashed ${currentBorderColor}`;
              el.setAttribute("data-ch-highlighted", "sample");
            }
          }
        } catch (e) {
          console.warn("Could not re-highlight sample:", sampleInfo.id, e);
        }
      });

      if (
        autoHighlightInferred &&
        isContainerConfirmed &&
        !currentSamplingTarget
      ) {
        const highlightInferredSelectorMatches = (
          selector: string,
          type: "author" | "content"
        ) => {
          if (selector && iframeDoc && helperSelectors.container) {
            try {
              const containerEl = iframeDoc.querySelector(
                helperSelectors.container
              );
              if (!containerEl) return;
              containerEl
                .querySelectorAll<HTMLElement>(selector)
                .forEach((el) => {
                  if (el.getAttribute("data-ch-highlighted") === "sample")
                    return;
                  el.style.backgroundColor =
                    type === "author"
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(16, 185, 129, 0.15)";
                  el.style.outline = `1px solid ${type === "author"
                    ? "rgba(37, 99, 235, 0.4)"
                    : "rgba(5, 150, 105, 0.4)"
                    }`;
                  el.style.outlineOffset = "0px";
                  el.setAttribute("data-ch-highlighted", "inferred");
                });
            } catch (e) {
              console.warn(
                `Invalid selector for ${type} inferred highlighting: ${selector}`,
                e
              );
            }
          }
        };
        highlightInferredSelectorMatches(helperSelectors.author, "author");
        highlightInferredSelectorMatches(helperSelectors.content, "content");
      }

      removeClickListener(); // Always remove previous before potentially adding new
      if (iframeDoc.body) {
        // Add click listener if sampling OR for inspection
        if (currentSamplingTarget || isContainerConfirmed) {
          iframeDoc.body.style.cursor = currentSamplingTarget
            ? "crosshair"
            : "default"; // Crosshair only if sampling

          iframeClickHandlerRef.current = (event: MouseEvent) => {
            // Simplified click-to-inspect logic
            if (!currentSamplingTarget && isContainerConfirmed) {
              event.preventDefault();
              event.stopPropagation();
              const clickedEl = event.target as HTMLElement;
              const containerEl = iframeDoc.querySelector(
                helperSelectors.container
              );
              if (
                containerEl &&
                containerEl.contains(clickedEl) &&
                clickedEl !== containerEl &&
                clickedEl !== iframeDoc.body &&
                clickedEl !== iframeDoc.documentElement
              ) {
                const generatedSels = generateSelectorsForElement(
                  clickedEl,
                  containerEl
                );
                const previewSels = generatedSels
                  .slice(0, 2) // Show fewer for brevity in message
                  .map((s) => `"${s}"`)
                  .join(", ");
                showUserMessage(
                  "info",
                  `Inspect: <${clickedEl.tagName.toLowerCase()}>. Sel: [${previewSels}${generatedSels.length > 2 ? "..." : ""
                  }]. Total: ${generatedSels.length}. (See console for all)`,
                  10000
                );
                console.log(
                  "Inspector Click:",
                  clickedEl,
                  "Selectors:",
                  generatedSels
                );
              }
              return; // Stop if it was an inspection click
            }

            // Sampling logic (only if currentSamplingTarget is set)
            if (!currentSamplingTarget) return;

            event.preventDefault();
            event.stopPropagation();
            const clickedEl = event.target as HTMLElement;

            if (
              !clickedEl ||
              !iframeDoc.body.contains(clickedEl) ||
              clickedEl === iframeDoc.body ||
              clickedEl === iframeDoc.documentElement
            )
              return;

            const existingElementId = clickedEl.id;
            const isAlreadyOurSample =
              existingElementId && existingElementId.startsWith("cc-sample-");
            let sampleIdToStore: string;
            let originalIdToStore: string | null = null;

            if (isAlreadyOurSample) {
              sampleIdToStore = existingElementId;
              originalIdToStore = clickedEl.getAttribute("data-cc-original-id");
            } else {
              sampleIdToStore = `cc-sample-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 7)}`;
              if (existingElementId) {
                originalIdToStore = existingElementId;
                clickedEl.setAttribute(
                  "data-cc-original-id",
                  existingElementId
                );
              }
              clickedEl.id = sampleIdToStore;
            }

            const newSample: SampleElementInfo = {
              id: sampleIdToStore,
              originalId: originalIdToStore,
              selectorPath: "", // Not actively used yet
              textPreview:
                clickedEl.textContent?.trim().substring(0, 50) || "Element",
            };

            const target = currentSamplingTarget;
            let finalSamplesList: SampleElementInfo[] = [];

            const updateSamplesStateAndGetList = (
              setSamplesFunc: React.Dispatch<
                React.SetStateAction<SampleElementInfo[]>
              >
            ): SampleElementInfo[] => {
              let list: SampleElementInfo[] = [];
              setSamplesFunc((prevSamples) => {
                const updated = [...prevSamples];
                // If appending (e.g. iterative content sampling), use current length as index
                // Otherwise, use nextSampleIndex which should be managed correctly.
                const indexToUpdate =
                  target === "content" && canAddMoreContentSamples
                    ? prevSamples.length
                    : nextSampleIndex;
                updated[indexToUpdate] = newSample;
                list = updated;
                return updated;
              });
              return list;
            };

            if (target === "author") {
              finalSamplesList = updateSamplesStateAndGetList(setAuthorSamples);
            } else if (target === "content") {
              finalSamplesList =
                updateSamplesStateAndGetList(setContentSamples);
            }

            // Auto-inference logic
            const minSamplesNeeded = MAX_INITIAL_SAMPLES;
            // For content, if we are in iterative mode, we might infer with more samples
            const samplesForCurrentInference =
              target === "content" &&
                canAddMoreContentSamples &&
                finalSamplesList.length > MAX_INITIAL_SAMPLES
                ? finalSamplesList
                : finalSamplesList.slice(0, minSamplesNeeded);

            if (
              target &&
              samplesForCurrentInference.length >= minSamplesNeeded
            ) {
              const currentIframeForInference = helperPreviewIframeRef.current;
              const currentIframeDocForInference =
                currentIframeForInference?.contentDocument;

              if (currentIframeDocForInference && helperSelectors.container) {
                const containerElement =
                  currentIframeDocForInference.querySelector(
                    helperSelectors.container
                  );
                if (containerElement) {
                  const authorSelForPattern =
                    target === "author" ? undefined : helperSelectors.author;
                  const result = findBestCommonSelectorUtil(
                    samplesForCurrentInference,
                    target,
                    currentIframeDocForInference,
                    containerElement,
                    denylistedHelperSelectors,
                    authorSelForPattern
                  );
                  if (result.bestSelector) {
                    setHelperSelectors((prev) => ({
                      ...prev,
                      [target]: result.bestSelector,
                    }));
                    if (target === "author") setRawAuthorSelectors([]);
                    else {
                      setRawContentSelectors([]);
                      setCanAddMoreContentSamples(false); // Success, stop iterative mode
                    }
                    showUserMessage(
                      "success",
                      `Auto-inferred ${target} selector: ${result.bestSelector
                      } (Confidence: ${result.confidence.toFixed(0)})`
                    );
                  } else {
                    if (target === "author")
                      setRawAuthorSelectors(result.allSampleSelectors);
                    else setRawContentSelectors(result.allSampleSelectors);
                    showUserMessage(
                      "info",
                      `Could not auto-infer ${target} selector. Review raw candidates or try different samples.`
                    );
                    if (
                      target === "content" &&
                      samplesForCurrentInference.length <
                      ABSOLUTE_MAX_CONTENT_SAMPLES
                    ) {
                      setCanAddMoreContentSamples(true); // Encourage adding more
                    } else if (target === "content") {
                      setCanAddMoreContentSamples(false); // Maxed out or inference still failed
                    }
                  }
                } else {
                  showUserMessage(
                    "error",
                    "Container element not found in preview during auto-inference."
                  );
                }
              }
            }

            let maxSamplesForThisRound =
              target === "author" ? MAX_INITIAL_SAMPLES : MAX_INITIAL_SAMPLES;
            if (target === "content" && canAddMoreContentSamples) {
              maxSamplesForThisRound = ABSOLUTE_MAX_CONTENT_SAMPLES;
            }

            const currentNumSamples =
              target === "author"
                ? authorSamples.length
                : contentSamples.length;

            if (
              nextSampleIndex + 1 >= maxSamplesForThisRound ||
              currentNumSamples +
              (target === "content" && canAddMoreContentSamples ? 0 : 1) >=
              maxSamplesForThisRound
            ) {
              setCurrentSamplingTarget(null);
            } else {
              setNextSampleIndex((prev) => prev + 1);
            }
          };
          iframeDoc.body.addEventListener(
            "click",
            iframeClickHandlerRef.current
          );
        } else {
          iframeDoc.body.style.cursor = "default"; // No sampling, no inspection (container not confirmed)
        }
      }
    };

    // Logic for iframe srcDoc content
    let srcDocContent = "";
    if (!activeHelperSiteKey)
      srcDocContent =
        '<p class="text-gray-400 italic p-4">Selector Helper is closed.</p>';
    else if (!helperHtmlInput)
      srcDocContent =
        '<p class="text-gray-400 italic p-4">Paste HTML to begin.</p>';
    else if (!helperSelectors.container && !isContainerConfirmed)
      srcDocContent =
        '<p class="text-gray-400 italic p-4">Infer or select a container selector.</p>';
    else if (helperSelectors.container) {
      try {
        const parser = new DOMParser();
        const fullDoc = parser.parseFromString(helperHtmlInput, "text/html");
        const containerElement = fullDoc.querySelector(
          helperSelectors.container
        );
        if (containerElement) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = containerElement.outerHTML;
          tempDiv
            .querySelectorAll("script, style")
            .forEach((el) => el.remove());
          Array.from(tempDiv.querySelectorAll("*")).forEach((el) => {
            Array.from(el.attributes).forEach((attr) => {
              if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
            });
          });
          const sanitizedContainerHtml = tempDiv.innerHTML;
          srcDocContent = `<style>body { padding: 10px; margin: 0; box-sizing: border-box; background-color: white; color: #333; font-family: sans-serif; line-height: 1.5; } </style>${sanitizedContainerHtml}`;
        } else {
          srcDocContent = `<p class="text-red-500 italic p-4">Container selector (<code class="text-sm bg-red-100 p-0.5 rounded break-all">${helperSelectors.container}</code>) not found.</p>`;
        }
      } catch (e) {
        srcDocContent = `<p class="text-red-500 italic p-4">Invalid container selector: ${String(
          e
        )}.</p>`;
      }
    } else {
      srcDocContent =
        '<p class="text-gray-400 italic p-4">Awaiting container selector.</p>';
    }

    if (iframe.srcdoc !== srcDocContent) {
      iframe.srcdoc = srcDocContent;
      if (iframeLoadHandlerRef.current)
        iframe.removeEventListener("load", iframeLoadHandlerRef.current);
      iframeLoadHandlerRef.current = () => {
        performLoadActions(); // Re-run highlights and attach click listener after new content loads
      };
      iframe.addEventListener("load", iframeLoadHandlerRef.current);
    } else {
      performLoadActions(); // If srcDoc hasn't changed, still re-run highlights/listener logic for state changes
    }

    return () => {
      removeClickListener();
      if (iframe && iframeLoadHandlerRef.current)
        iframe.removeEventListener("load", iframeLoadHandlerRef.current);
    };
  }, [
    helperHtmlInput,
    helperSelectors.container,
    helperSelectors.author,
    helperSelectors.content,
    activeHelperSiteKey,
    isContainerConfirmed,
    currentSamplingTarget,
    authorSamples,
    contentSamples,
    nextSampleIndex,
    autoHighlightInferred,
    showUserMessage,
    denylistedHelperSelectors,
    canAddMoreContentSamples,
    // MAX_INITIAL_SAMPLES, ABSOLUTE_MAX_CONTENT_SAMPLES are constants
  ]);

  useEffect(() => {
    // Reset helper state when HTML input or active site key changes
    setDenylistedHelperSelectors(new Set());
    setCurrentCandidates(null);
    setHelperSelectors({ container: "", author: "", content: "" });
    setIsContainerConfirmed(false);
    setAuthorSamples([]);
    setContentSamples([]);
    setRawAuthorSelectors([]);
    setRawContentSelectors([]);
    setCurrentSamplingTarget(null);
    setNextSampleIndex(0);
    setIncorrectHelperFields({});
    setCanAddMoreContentSamples(false);
  }, [helperHtmlInput, activeHelperSiteKey]);

  const handleSave = async () => {
    if (!draftConfig) return;
    setIsSaving(true);
    setError(null);
    try {
      await setConfig(draftConfig);
      setConfigState(JSON.parse(JSON.stringify(draftConfig)));
      showUserMessage("success", "Configuration saved successfully!");
    } catch (err) {
      console.error("Failed to save config:", err);
      showUserMessage("error", "Error saving configuration. Check console.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateGlobalSetting = (
    field: keyof Config["global"],
    value: string | number
  ) => {
    setDraftConfig((prev) =>
      prev
        ? {
          ...prev,
          global: {
            ...prev.global,
            [field]:
              typeof prev.global[field] === "number" ? Number(value) : value,
          },
        }
        : prev
    );
  };

  const handleAddSite = () => {
    if (!newSitePattern.trim()) {
      showUserMessage("error", "Please enter a site URL pattern.");
      return;
    }
    if (draftConfig && draftConfig.sites[newSitePattern.trim()]) {
      showUserMessage("error", "Site with this pattern already exists.");
      return;
    }
    if (draftConfig) {
      const newSiteKey = newSitePattern.trim();
      setDraftConfig((prev) => ({
        ...prev!,
        sites: {
          ...prev!.sites,
          [newSiteKey]: {
            label: newSiteKey,
            users: [],
            selectors: { container: "", author: "", content: "" },
          },
        },
      }));
      setSelectedSiteKey(newSiteKey);
      setNewSitePattern("");
      setCollapsedSections((prev) => ({ ...prev, siteManagement: false }));
      showUserMessage("success", `Site "${newSiteKey}" added.`);
    }
  };

  const handleRemoveSite = (siteKeyToRemove: string) => {
    if (!draftConfig || !siteKeyToRemove) return;
    if (
      window.confirm(
        `Remove site: ${draftConfig.sites[siteKeyToRemove]?.label || siteKeyToRemove
        }?`
      )
    ) {
      let newSelectedSiteKey: string | null = selectedSiteKey;
      setDraftConfig((prev) => {
        const newSites = { ...prev!.sites };
        delete newSites[siteKeyToRemove];
        if (selectedSiteKey === siteKeyToRemove) {
          const remainingSiteKeys = Object.keys(newSites);
          newSelectedSiteKey =
            remainingSiteKeys.length > 0 ? remainingSiteKeys[0] : null;
        }
        return { ...prev!, sites: newSites };
      });
      setSelectedSiteKey(newSelectedSiteKey);
      if (activeHelperSiteKey === siteKeyToRemove) setActiveHelperSiteKey(null); // Close helper if active for this site
      showUserMessage(
        "info",
        `Site "${draftConfig.sites[siteKeyToRemove]?.label || siteKeyToRemove
        }" removed.`
      );
    }
  };

  const updateSelectedSiteConfig = (
    field: keyof Config["sites"][string],
    value: Config["sites"][string][keyof Config["sites"][string]]
  ) => {
    if (!selectedSiteKey || !draftConfig) return;
    setDraftConfig((prev) =>
      prev
        ? {
          ...prev,
          sites: {
            ...prev.sites,
            [selectedSiteKey]: {
              ...prev.sites[selectedSiteKey],
              [field]: value,
            },
          },
        }
        : prev
    );
  };

  const toggleMainSection = (sectionKey: string) =>
    setCollapsedSections((c) => ({ ...c, [sectionKey]: !c[sectionKey] }));

  const toggleSelectorHelperForSelectedSite = () => {
    if (!selectedSiteKey) {
      showUserMessage("info", "Select a site first.");
      return;
    }
    if (activeHelperSiteKey === selectedSiteKey) {
      setActiveHelperSiteKey(null);
    } else {
      setActiveHelperSiteKey(selectedSiteKey);
      const currentSiteSelectors = draftConfig?.sites[selectedSiteKey]
        ?.selectors || { container: "", author: "", content: "" };
      setHelperSelectors(currentSiteSelectors);
      setIsContainerConfirmed(!!currentSiteSelectors.container);
      setCanAddMoreContentSamples(false); // Reset iterative mode when helper opens/switches site
    }
  };

  const runContainerInference = useCallback(() => {
    if (!helperHtmlInput) {
      showUserMessage("info", "Paste HTML to infer selectors.");
      return;
    }
    const parser = new DOMParser();
    const fullDoc = parser.parseFromString(helperHtmlInput, "text/html");
    const scoredCandidates: Array<{
      selector: string;
      textPreview: string;
      uniqueInScope: boolean;
      score: number;
    }> = [];
    const generatedSelectorsInThisRun = new Set<string>();

    // Prioritize elements with common chat-related keywords in attributes
    let potentialElements: Element[] = Array.from(
      fullDoc.querySelectorAll(
        "div, section, article, ul, ol, dl, main, form, table, tbody, #chat, .chat, #messages, .messages, #log, .log, #feed, .feed, [role='log'], [role='feed'], [role='list'], [class*='chat-'], [class*='message-list'], [class*='scroller'], [data-testid*='chat'], [data-testid*='message']"
      )
    );
    // Add more general structural elements if specific ones are too few
    if (potentialElements.length < 10) {
      potentialElements.push(
        ...Array.from(fullDoc.querySelectorAll("div, section, main, article"))
      );
    }
    // Filter and de-duplicate
    potentialElements = Array.from(new Set(potentialElements)).filter((el) => {
      const textContent = el.textContent || "";
      return (
        el.childElementCount >= 1 && // Must have children (messages)
        textContent.trim().length > 20 && // Must have some text
        !denylistedHelperSelectors.has(el.id || el.className) &&
        el.tagName.toLowerCase() !== "body" &&
        el.tagName.toLowerCase() !== "html"
      );
    });

    uniqueElementsLoop: for (const el of potentialElements) {
      // Limit processing if too many potential elements found to avoid performance issues
      if (scoredCandidates.length > 100 && potentialElements.length > 300)
        break uniqueElementsLoop;

      const candDetails = generateCandidateSelectorForContainer(
        el,
        fullDoc,
        generatedSelectorsInThisRun
      );
      if (candDetails && !denylistedHelperSelectors.has(candDetails.selector)) {
        const score = scoreContainerCandidate(candDetails, el);
        const textPreviewContent =
          el.textContent?.trim() || "Element has no direct text";
        scoredCandidates.push({
          ...candDetails,
          textPreview:
            textPreviewContent.substring(0, 100).replace(/\s+/g, " ") +
            (textPreviewContent.length > 100 ? "..." : ""),
          score,
        });
        generatedSelectorsInThisRun.add(candDetails.selector);
      }
    }

    const viableCandidates = scoredCandidates
      .filter((c) => c.score > -50) // Keep a reasonable score threshold
      .sort((a, b) => b.score - a.score);

    if (viableCandidates.length > 0) {
      setCurrentCandidates({
        field: "container",
        list: viableCandidates.slice(0, 20), // Show top 20
      });
      showUserMessage(
        "info",
        `Found ${viableCandidates.length
        } container candidates. Showing top ${Math.min(
          20,
          viableCandidates.length
        )}.`
      );
    } else {
      setCurrentCandidates(null);
      showUserMessage("info", "No suitable container candidates found.");
    }
  }, [helperHtmlInput, denylistedHelperSelectors, showUserMessage]);

  const handleConfirmContainer = useCallback(() => {
    if (helperSelectors.container) {
      setIsContainerConfirmed(true);
      setIncorrectHelperFields((prev) => ({ ...prev, container: false }));
      setCurrentCandidates(null);
      showUserMessage(
        "success",
        "Container confirmed. You can now select samples for Author/Content.",
        3000
      );
      setHelperSelectors((prev) => ({ ...prev, author: "", content: "" }));
      setAuthorSamples([]);
      setContentSamples([]);
      setRawAuthorSelectors([]);
      setRawContentSelectors([]);
      setCurrentSamplingTarget(null);
      setNextSampleIndex(0);
      setCanAddMoreContentSamples(false);
    } else {
      showUserMessage("error", "Enter/select a container selector to confirm.");
    }
  }, [helperSelectors.container, showUserMessage]);

  const handleEditContainer = () => {
    setIsContainerConfirmed(false);
    setHelperSelectors((prev) => ({ ...prev, author: "", content: "" }));
    setIncorrectHelperFields((prev) => ({
      ...prev,
      author: false,
      content: false,
    }));
    setAuthorSamples([]);
    setContentSamples([]);
    setRawAuthorSelectors([]);
    setRawContentSelectors([]);
    setCurrentSamplingTarget(null);
    setNextSampleIndex(0);
    setCanAddMoreContentSamples(false);
    showUserMessage("info", "Container editing re-enabled.", 3000);
  };

  const handleSelectCandidateContainer = (selector: string) => {
    setHelperSelectors((prev) => ({ ...prev, container: selector }));
    setCurrentCandidates(null);
    setIncorrectHelperFields((prev) => ({ ...prev, container: false }));
    showUserMessage(
      "success",
      `Container '${selector}' selected. Please Confirm.`,
      3000
    );
  };

  const handleMarkCandidateAsBad = (selectorToDeny: string) => {
    setDenylistedHelperSelectors((prev) => new Set(prev).add(selectorToDeny));
    if (currentCandidates && currentCandidates.field === "container") {
      const newList = currentCandidates.list.filter(
        (c) => c.selector !== selectorToDeny
      );
      if (newList.length > 0)
        setCurrentCandidates((prev) =>
          prev ? { ...prev, list: newList } : null
        );
      else {
        setCurrentCandidates(null);
        showUserMessage("info", `All container candidates denylisted.`);
      }
    }
    showUserMessage(
      "info",
      `Selector "${selectorToDeny}" denylisted for this session.`
    );
  };

  const handleMarkIncorrectHelperField = (
    field: keyof InferredSelectorValues
  ) => {
    const selectorToDeny = helperSelectors[field];
    if (selectorToDeny)
      setDenylistedHelperSelectors((prev) => new Set(prev).add(selectorToDeny));
    setHelperSelectors((prev) => ({ ...prev, [field]: "" }));
    setIncorrectHelperFields((prev) => ({ ...prev, [field]: true }));
    if (field === "container") {
      setIsContainerConfirmed(false);
      setHelperSelectors((prev) => ({ ...prev, author: "", content: "" }));
      setAuthorSamples([]);
      setContentSamples([]);
      setRawAuthorSelectors([]);
      setRawContentSelectors([]);
      setCurrentSamplingTarget(null);
      setNextSampleIndex(0);
      setCurrentCandidates(null);
      setCanAddMoreContentSamples(false);
    }
    if (field === "author") setRawAuthorSelectors([]);
    if (field === "content") {
      setRawContentSelectors([]);
      setCanAddMoreContentSamples(false);
    }
    showUserMessage(
      "info",
      `${selectorToDeny ? `"${selectorToDeny}" denylisted. ` : ""
      }${field} cleared.`
    );
  };

  const handleHelperSelectorChange = (
    field: keyof InferredSelectorValues,
    value: string
  ) => {
    setHelperSelectors((prev) => ({ ...prev, [field]: value }));
    if (
      field === "container" &&
      isContainerConfirmed &&
      value !== helperSelectors.container
    ) {
      setIsContainerConfirmed(false);
      setHelperSelectors((prev) => ({ ...prev, author: "", content: "" }));
      setAuthorSamples([]);
      setContentSamples([]);
      setRawAuthorSelectors([]);
      setRawContentSelectors([]);
      setCurrentSamplingTarget(null);
      setNextSampleIndex(0);
      setCanAddMoreContentSamples(false);
      showUserMessage("info", "Container changed, please re-confirm.", 3000);
    }
    setIncorrectHelperFields((prev) => ({ ...prev, [field]: false }));
    if (field === "container") setCurrentCandidates(null);
    if (
      field === "author" &&
      rawAuthorSelectors.length > 0 &&
      value !== helperSelectors.author
    )
      setRawAuthorSelectors([]);
    if (
      field === "content" &&
      rawContentSelectors.length > 0 &&
      value !== helperSelectors.content
    ) {
      setRawContentSelectors([]);
      setCanAddMoreContentSamples(false);
    }
  };

  const startSampling = (target: "author" | "content") => {
    if (!isContainerConfirmed) {
      showUserMessage("error", "Please confirm the container selector first.");
      return;
    }

    if (target === "author") {
      setAuthorSamples([]); // Always reset author samples fully
      setNextSampleIndex(0);
      if (rawAuthorSelectors.length > 0) setRawAuthorSelectors([]);
      showUserMessage(
        "info",
        `Click in the preview to select Author sample 1.`
      );
    } else {
      // target === "content"
      if (
        canAddMoreContentSamples &&
        contentSamples.length < ABSOLUTE_MAX_CONTENT_SAMPLES
      ) {
        // Appending to existing content samples
        setNextSampleIndex(contentSamples.length);
        showUserMessage(
          "info",
          `Click to add Content sample ${contentSamples.length + 1}.`
        );
      } else {
        // Resetting content samples (either not in iterative mode, or maxed out)
        setContentSamples([]);
        setNextSampleIndex(0);
        setCanAddMoreContentSamples(false);
        if (rawContentSelectors.length > 0) setRawContentSelectors([]);
        showUserMessage(
          "info",
          `Click in the preview to select Content sample 1.`
        );
      }
    }
    setCurrentSamplingTarget(target);
  };

  const inferSelectorsFromSamples = useCallback(() => {
    const minAuthorSamplesMet = authorSamples.length >= MAX_INITIAL_SAMPLES;
    // For content, check against current list, inference can run with MAX_INITIAL or more if iterative
    const minContentSamplesMet = contentSamples.length >= MAX_INITIAL_SAMPLES;

    if (!minAuthorSamplesMet && !minContentSamplesMet) {
      showUserMessage(
        "error",
        `Please select at least ${MAX_INITIAL_SAMPLES} samples for Author and/or Content to infer.`
      );
      return;
    }
    const iframe = helperPreviewIframeRef.current;
    if (!iframe?.contentDocument?.body || !helperSelectors.container) {
      showUserMessage(
        "error",
        "Cannot access preview content/body or container not set."
      );
      return;
    }
    const iframeDoc = iframe.contentDocument;
    const containerElement = iframeDoc.querySelector(helperSelectors.container);
    if (!containerElement) {
      showUserMessage("error", "Container element not found in preview.");
      return;
    }

    let authorMsgShown = false,
      contentMsgShown = false;
    setCanAddMoreContentSamples(false); // Reset iterative flag before this explicit inference

    if (minAuthorSamplesMet) {
      const result = findBestCommonSelectorUtil(
        authorSamples,
        "author",
        iframeDoc,
        containerElement,
        denylistedHelperSelectors
      );
      if (result.bestSelector) {
        setHelperSelectors((prev) => ({
          ...prev,
          author: result.bestSelector,
        }));
        setRawAuthorSelectors([]);
        showUserMessage(
          "success",
          `Inferred author selector: ${result.bestSelector
          } (Confidence: ${result.confidence.toFixed(0)})`
        );
        authorMsgShown = true;
      } else {
        setRawAuthorSelectors(result.allSampleSelectors);
        showUserMessage(
          "info",
          "Could not infer a strong Author selector. Review raw candidates or try different samples."
        );
        authorMsgShown = true;
      }
    } else if (authorSamples.length > 0) {
      showUserMessage(
        "info",
        `Need ${MAX_INITIAL_SAMPLES - authorSamples.length
        } more author sample(s) to infer.`
      );
      authorMsgShown = true;
    }

    if (minContentSamplesMet) {
      const result = findBestCommonSelectorUtil(
        contentSamples, // Use all collected content samples
        "content",
        iframeDoc,
        containerElement,
        denylistedHelperSelectors,
        helperSelectors.author // Pass current author selector for pattern matching
      );
      if (result.bestSelector) {
        setHelperSelectors((prev) => ({
          ...prev,
          content: result.bestSelector,
        }));
        setRawContentSelectors([]);
        showUserMessage(
          "success",
          `Inferred content selector: ${result.bestSelector
          } (Confidence: ${result.confidence.toFixed(0)})`
        );
        contentMsgShown = true;
      } else {
        setRawContentSelectors(result.allSampleSelectors);
        showUserMessage(
          "info",
          "Could not infer a strong Content selector. Review raw candidates or try different samples."
        );
        if (contentSamples.length < ABSOLUTE_MAX_CONTENT_SAMPLES) {
          setCanAddMoreContentSamples(true);
          showUserMessage(
            "info",
            "Content selector weak. Try adding more content samples (up to " +
            ABSOLUTE_MAX_CONTENT_SAMPLES +
            ") or adjust manually.",
            7000
          );
        }
        contentMsgShown = true;
      }
    } else if (contentSamples.length > 0) {
      showUserMessage(
        "info",
        `Need ${MAX_INITIAL_SAMPLES - contentSamples.length
        } more content sample(s) to infer.`
      );
      contentMsgShown = true;
    }

    if (
      !authorMsgShown &&
      !contentMsgShown &&
      authorSamples.length < MAX_INITIAL_SAMPLES &&
      contentSamples.length < MAX_INITIAL_SAMPLES
    ) {
      showUserMessage(
        "info",
        `Select at least ${MAX_INITIAL_SAMPLES} samples for Author and/or Content to infer selectors.`
      );
    }
  }, [
    authorSamples,
    contentSamples,
    helperSelectors.container,
    helperSelectors.author,
    denylistedHelperSelectors,
    showUserMessage,
    // MAX_INITIAL_SAMPLES, ABSOLUTE_MAX_CONTENT_SAMPLES are constants
  ]);

  const applyHelperSelectorsToSite = () => {
    if (!helperSelectors.container) {
      showUserMessage("error", "Container selector cannot be empty.");
      return;
    }
    if (
      (helperSelectors.author || helperSelectors.content) &&
      !isContainerConfirmed
    ) {
      showUserMessage(
        "info",
        "Confirm container before applying author/content."
      );
      return;
    }
    // Optional: warnings if selectors seem incomplete but container is confirmed
    if (
      isContainerConfirmed &&
      !helperSelectors.author &&
      authorSamples.length > 0
    ) {
      showUserMessage(
        "info",
        "Author selector is not set. Consider inferring or setting it.",
        4000
      );
    }
    if (
      isContainerConfirmed &&
      !helperSelectors.content &&
      contentSamples.length > 0
    ) {
      showUserMessage(
        "info",
        "Content selector is not set. Consider inferring or setting it.",
        4000
      );
    }

    if (selectedSiteKey && draftConfig) {
      updateSelectedSiteConfig("selectors", { ...helperSelectors });
      showUserMessage(
        "success",
        `Selectors applied to "${draftConfig.sites[selectedSiteKey]?.label || selectedSiteKey
        }". Remember to Save overall changes.`,
        4000
      );
    }
  };

  const mockChatData = useMemo(() => {
    if (!activeHelperSiteKey || !helperHtmlInput || !helperSelectors.container)
      return null; // Require container for any meaningful preview

    try {
      const parser = new DOMParser();
      const fullDoc = parser.parseFromString(helperHtmlInput, "text/html");
      const containerElement = fullDoc.querySelector(helperSelectors.container);

      if (!containerElement) {
        return {
          author: "Container not found",
          content: "Container not found",
          containerFound: false,
          authorSelectorValid: false,
          contentSelectorValid: false,
          containerSelectorValid: false,
        };
      }

      let authorText = "Author selector not set or not found";
      let contentText = "Content selector not set or not found";
      let authorSelectorValid = false;
      let contentSelectorValid = false;

      if (helperSelectors.author?.trim()) {
        try {
          const el = containerElement.querySelector(helperSelectors.author);
          if (el) {
            authorText = el.textContent?.trim() || "Author (empty)";
            authorSelectorValid = true;
          } else authorText = "Author (not found in container)";
        } catch {
          authorText = "Author (invalid selector)";
        }
      }

      if (helperSelectors.content?.trim()) {
        try {
          // Try to find content relative to a found author if possible, or just in container
          let scopeForContent: Element | null = containerElement;
          if (authorSelectorValid && helperSelectors.author) {
            const authorEl = containerElement.querySelector(
              helperSelectors.author
            );
            // A simple heuristic: check parent of author, or author itself if it's a wrapper
            if (authorEl) scopeForContent = authorEl.parentElement || authorEl;
          }

          const el = scopeForContent!.querySelector(helperSelectors.content);
          if (el) {
            contentText = el.textContent?.trim() || "Content (empty)";
            contentSelectorValid = true;
          } else contentText = "Content (not found in scope)";
        } catch {
          contentText = "Content (invalid selector)";
        }
      }

      return {
        author: authorText,
        content: contentText,
        containerFound: true,
        authorSelectorValid,
        contentSelectorValid,
        containerSelectorValid: true,
      };
    } catch (e) {
      console.error("Mock chat generation failed:", e);
      return {
        author: "Error parsing HTML for preview",
        content: "Error generating preview",
        containerFound: false,
        authorSelectorValid: false,
        contentSelectorValid: false,
        containerSelectorValid: false,
      };
    }
  }, [activeHelperSiteKey, helperHtmlInput, helperSelectors]);

  if (isLoading)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-xl font-semibold text-gray-700">
          Loading Dashboard...
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 p-4 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <div className="text-xl font-semibold text-red-700">
          An Error Occurred
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
        >
          Retry
        </button>
      </div>
    );
  if (!draftConfig || !config)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
        <div className="text-xl font-semibold text-red-500">
          Error: Configuration data is not available.
        </div>
      </div>
    );

  const siteKeys = Object.keys(draftConfig.sites);
  const selectedSiteData = selectedSiteKey
    ? draftConfig.sites[selectedSiteKey]
    : null;
  const noChangesToSave =
    JSON.stringify(config) === JSON.stringify(draftConfig);

  const canInferFromSamples =
    (authorSamples.length >= MAX_INITIAL_SAMPLES ||
      contentSamples.length >= MAX_INITIAL_SAMPLES) &&
    !currentSamplingTarget;

  // UI Text for sample buttons
  const authorSampleButtonText =
    authorSamples.length < MAX_INITIAL_SAMPLES
      ? `Select Author Sample ${authorSamples.length + 1
      }/${MAX_INITIAL_SAMPLES}`
      : `Reselect Author Samples (${authorSamples.length}/${MAX_INITIAL_SAMPLES})`;

  let contentSampleButtonText: string;
  if (canAddMoreContentSamples) {
    contentSampleButtonText =
      contentSamples.length < ABSOLUTE_MAX_CONTENT_SAMPLES
        ? `Add Content Sample (${contentSamples.length + 1
        }/${ABSOLUTE_MAX_CONTENT_SAMPLES})`
        : `Max Content Samples Reached (${contentSamples.length}/${ABSOLUTE_MAX_CONTENT_SAMPLES})`;
  } else {
    contentSampleButtonText =
      contentSamples.length < MAX_INITIAL_SAMPLES
        ? `Select Content Sample ${contentSamples.length + 1
        }/${MAX_INITIAL_SAMPLES}`
        : `Reselect Content Samples (${contentSamples.length}/${MAX_INITIAL_SAMPLES})`;
  }

  const isContentSamplingMaxed =
    canAddMoreContentSamples &&
    contentSamples.length >= ABSOLUTE_MAX_CONTENT_SAMPLES;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 font-sans">
      {userMessage && (
        <div
          className={`fixed top-5 right-5 p-4 rounded-lg shadow-xl text-sm z-[100] flex items-start ${userMessage.type === "error" ? "bg-red-500 text-white" : ""
            } ${userMessage.type === "success" ? "bg-green-500 text-white" : ""
            } ${userMessage.type === "info" ? "bg-blue-500 text-white" : ""} `}
        >
          <Info size={20} className="mr-2 flex-shrink-0 mt-0.5" />
          <span className="flex-grow break-words max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
            {userMessage.message}
          </span>
          <button
            onClick={() => setUserMessage(null)}
            className="ml-3 text-current hover:opacity-75 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <header className="mb-6 md:mb-8 flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
          ChatClapper Dashboard
        </h1>
        <button
          onClick={handleSave}
          disabled={isSaving || noChangesToSave}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center transition-opacity"
        >
          <Save size={18} className="mr-2" />
          {isSaving
            ? "Saving..."
            : noChangesToSave
              ? "No Changes"
              : "Save Changes"}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CollapsibleSection
            title="Global Settings"
            icon={<Settings size={20} />}
            initiallyCollapsed={collapsedSections.globalSettings}
            onToggle={() => toggleMainSection("globalSettings")}
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="replacementText"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Replacement Text
                </label>
                <input
                  id="replacementText"
                  type="text"
                  value={draftConfig.global.replacementText}
                  onChange={(e) =>
                    updateGlobalSetting("replacementText", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., [message clapped]"
                />
              </div>
              <div>
                <label
                  htmlFor="delaySeconds"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Delay (seconds)
                </label>
                <input
                  id="delaySeconds"
                  type="number"
                  min="0"
                  value={draftConfig.global.delaySeconds}
                  onChange={(e) =>
                    updateGlobalSetting("delaySeconds", Number(e.target.value))
                  }
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., 0"
                />
              </div>
            </div>
          </CollapsibleSection>
          <CollapsibleSection
            title="Site Configurations"
            icon={<List size={20} />}
            initiallyCollapsed={collapsedSections.siteManagement}
            onToggle={() => toggleMainSection("siteManagement")}
          >
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <label
                  htmlFor="newSitePattern"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Add New Site (URL Pattern)
                </label>
                <div className="flex space-x-2 items-center">
                  <input
                    id="newSitePattern"
                    type="text"
                    value={newSitePattern}
                    onChange={(e) => setNewSitePattern(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
                    className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., twitch.tv"
                  />
                  <button
                    onClick={handleAddSite}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-md shadow-sm flex items-center whitespace-nowrap"
                  >
                    <PlusCircle size={18} className="mr-1.5" /> Add Site
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use a broad pattern like "domain.com" or specific like
                  "domain.com/path".
                </p>
              </div>
              {siteKeys.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <label
                      htmlFor="siteSelector"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Edit Site Configuration
                    </label>
                    <select
                      id="siteSelector"
                      value={selectedSiteKey || ""}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        setSelectedSiteKey(newKey);
                        if (
                          activeHelperSiteKey &&
                          activeHelperSiteKey !== newKey
                        )
                          setActiveHelperSiteKey(null);
                      }}
                      className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value="" disabled>
                        -- Select a Site --
                      </option>
                      {siteKeys.map((key) => (
                        <option key={key} value={key}>
                          {draftConfig.sites[key]?.label || key}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedSiteKey && selectedSiteData && (
                    <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-4 shadow">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-indigo-700">
                          Editing: {selectedSiteData.label || selectedSiteKey}
                        </h4>
                        <button
                          onClick={() => handleRemoveSite(selectedSiteKey)}
                          className="text-sm text-red-500 hover:text-red-700 font-semibold flex items-center p-1 hover:bg-red-50 rounded"
                          title={`Remove ${selectedSiteData.label || selectedSiteKey
                            }`}
                        >
                          <Trash2 size={16} className="mr-1" /> Remove Site
                        </button>
                      </div>
                      <div>
                        <label
                          htmlFor={`label-${selectedSiteKey}`}
                          className="block text-sm font-medium text-gray-600 mb-1"
                        >
                          Display Label
                        </label>
                        <input
                          id={`label-${selectedSiteKey}`}
                          key={`label-input-${selectedSiteKey}`}
                          type="text"
                          value={selectedSiteData.label || ""}
                          onChange={(e) =>
                            updateSelectedSiteConfig("label", e.target.value)
                          }
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Custom label for this site"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`users-${selectedSiteKey}`}
                          className="block text-sm font-medium text-gray-600 mb-1"
                        >
                          Blocked Users (one per line)
                        </label>
                        <textarea
                          id={`users-${selectedSiteKey}`}
                          key={`users-input-${selectedSiteKey}`}
                          value={selectedSiteData.users.join("\n")}
                          onChange={(e) =>
                            updateSelectedSiteConfig(
                              "users",
                              e.target.value
                                .split("\n")
                                .map((u) => u.trim())
                                .filter((u) => u)
                            )
                          }
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          rows={4}
                          placeholder={"username1\nusername2"}
                        />
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={toggleSelectorHelperForSelectedSite}
                          className="text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold py-2 px-3 rounded-md transition duration-150 ease-in-out mb-3 flex items-center"
                        >
                          {activeHelperSiteKey === selectedSiteKey ? (
                            <EyeOff size={16} className="mr-1.5" />
                          ) : (
                            <Eye size={16} className="mr-1.5" />
                          )}
                          {activeHelperSiteKey === selectedSiteKey
                            ? "Close"
                            : "Open"}{" "}
                          Selector Helper
                        </button>
                        {activeHelperSiteKey === selectedSiteKey && (
                          <div className="p-3 md:p-4 bg-indigo-50 border border-indigo-200 rounded-md space-y-4">
                            <div>
                              <label
                                htmlFor={`html-${selectedSiteKey}`}
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Paste Full Page HTML
                              </label>
                              <textarea
                                id={`html-${selectedSiteKey}`}
                                value={helperHtmlInput}
                                onChange={(e) =>
                                  setHelperHtmlInput(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                                rows={8}
                                placeholder="Paste the full HTML source of the page here"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Live Preview of Container Content (Highlighted)
                              </label>
                              <div
                                className={`resize-y overflow-auto border border-gray-400 rounded-md bg-gray-200 max-h-[80vh] ${isContainerConfirmed
                                  ? "min-h-[400px]"
                                  : "min-h-[300px]"
                                  }`}
                              >
                                <iframe
                                  sandbox="allow-scripts allow-same-origin"
                                  ref={helperPreviewIframeRef}
                                  title="HTML Preview"
                                  className="w-full h-full p-0 border-0 bg-white block"
                                />
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
                                {(authorSamples.length > 0 ||
                                  contentSamples.length > 0 ||
                                  currentSamplingTarget) && (
                                    <>
                                      <span className="flex items-center">
                                        <span className="inline-block w-3 h-3 border-2 border-dashed border-blue-500 mr-1"></span>
                                        Author Sample
                                      </span>
                                      <span className="flex items-center">
                                        <span className="inline-block w-3 h-3 border-2 border-dashed border-green-500 mr-1"></span>
                                        Content Sample
                                      </span>
                                      {currentSamplingTarget &&
                                        ((currentSamplingTarget === "author" &&
                                          nextSampleIndex <
                                          MAX_INITIAL_SAMPLES) ||
                                          (currentSamplingTarget === "content" &&
                                            nextSampleIndex <
                                            (canAddMoreContentSamples
                                              ? ABSOLUTE_MAX_CONTENT_SAMPLES
                                              : MAX_INITIAL_SAMPLES))) && (
                                          <span className="flex items-center">
                                            <span className="inline-block w-3 h-3 border-2 border-dashed border-orange-500 mr-1"></span>
                                            Next Pick
                                          </span>
                                        )}
                                    </>
                                  )}
                                {isContainerConfirmed &&
                                  autoHighlightInferred &&
                                  (helperSelectors.author ||
                                    helperSelectors.content) && (
                                    <>
                                      {helperSelectors.author && (
                                        <span className="flex items-center">
                                          <span
                                            style={{
                                              backgroundColor:
                                                "rgba(59, 130, 246, 0.15)",
                                              border:
                                                "1px solid rgba(37, 99, 235, 0.4)",
                                            }}
                                            className="inline-block w-3 h-3 mr-1"
                                          ></span>
                                          Inferred Author
                                        </span>
                                      )}
                                      {helperSelectors.content && (
                                        <span className="flex items-center">
                                          <span
                                            style={{
                                              backgroundColor:
                                                "rgba(16, 185, 129, 0.15)",
                                              border:
                                                "1px solid rgba(5, 150, 105, 0.4)",
                                            }}
                                            className="inline-block w-3 h-3 mr-1"
                                          ></span>
                                          Inferred Content
                                        </span>
                                      )}
                                    </>
                                  )}
                                {!currentSamplingTarget &&
                                  isContainerConfirmed && (
                                    <span className="flex items-center text-gray-500">
                                      <MousePointerClick
                                        size={14}
                                        className="mr-1"
                                      />
                                      Click in preview to inspect elements.
                                    </span>
                                  )}
                              </div>
                            </div>
                            <div className="space-y-3 pt-3 border-t border-gray-200">
                              {/* Container Selector Input and Actions */}
                              <div className="flex items-end space-x-2">
                                <div className="flex-grow">
                                  <label
                                    htmlFor={`helper-container-${selectedSiteKey}`}
                                    className="block text-xs font-medium text-gray-600 capitalize"
                                  >
                                    Container Selector
                                  </label>
                                  <input
                                    id={`helper-container-${selectedSiteKey}`}
                                    type="text"
                                    value={helperSelectors.container}
                                    onChange={(e) =>
                                      handleHelperSelectorChange(
                                        "container",
                                        e.target.value
                                      )
                                    }
                                    disabled={isContainerConfirmed}
                                    className={`w-full p-1.5 border rounded-md text-xs shadow-sm ${incorrectHelperFields.container
                                      ? "border-red-400 bg-red-50"
                                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                      } ${isContainerConfirmed
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                                      }`}
                                    placeholder="e.g., .chat-messages"
                                  />
                                </div>
                                <button
                                  onClick={() =>
                                    handleMarkIncorrectHelperField("container")
                                  }
                                  title="Mark as incorrect / Clear field & denylist"
                                  className={`text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 ${isContainerConfirmed
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                    }`}
                                  disabled={
                                    isContainerConfirmed ||
                                    !helperSelectors.container
                                  }
                                >
                                  <XCircle size={18} />
                                </button>
                              </div>
                              {!isContainerConfirmed && helperHtmlInput && (
                                <button
                                  onClick={runContainerInference}
                                  className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm shadow-sm flex items-center"
                                >
                                  <Search size={16} className="mr-1.5" />
                                  Suggest Containers
                                </button>
                              )}
                              {currentCandidates &&
                                currentCandidates.field === "container" && (
                                  <div className="p-3 border border-purple-300 bg-purple-50 rounded-md shadow-sm">
                                    <h5 className="text-sm font-semibold text-purple-700 mb-2">
                                      Container Candidates: (Top{" "}
                                      {currentCandidates.list.length})
                                    </h5>
                                    {currentCandidates.list.length === 0 ? (
                                      <p className="text-sm text-gray-500 italic">
                                        No candidates.
                                      </p>
                                    ) : (
                                      <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                        {currentCandidates.list.map(
                                          (cand, idx) => (
                                            <li
                                              key={idx}
                                              className="p-2 border border-gray-200 rounded-md bg-white shadow-xs hover:border-purple-400"
                                            >
                                              <div className="flex justify-between items-start mb-1">
                                                <code className="text-xs text-purple-800 bg-purple-100 p-1 rounded break-all flex-grow mr-2">
                                                  {cand.selector}
                                                </code>
                                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                                  Score: {cand.score.toFixed(1)}
                                                </span>
                                              </div>
                                              {cand.uniqueInScope && (
                                                <span className="text-xs text-green-600 block mb-1">
                                                  (Unique in Scope)
                                                </span>
                                              )}
                                              <p
                                                className="text-xs text-gray-600 break-words mb-2"
                                                title={cand.textPreview}
                                              >
                                                Preview: {cand.textPreview}
                                              </p>
                                              <div className="flex space-x-2">
                                                <button
                                                  onClick={() =>
                                                    handleSelectCandidateContainer(
                                                      cand.selector
                                                    )
                                                  }
                                                  className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded flex items-center"
                                                >
                                                  <Target
                                                    size={14}
                                                    className="mr-1"
                                                  />
                                                  Select
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleMarkCandidateAsBad(
                                                      cand.selector
                                                    )
                                                  }
                                                  className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded flex items-center"
                                                >
                                                  <Ban
                                                    size={14}
                                                    className="mr-1"
                                                  />
                                                  Mark Bad
                                                </button>
                                              </div>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              {helperSelectors.container &&
                                !isContainerConfirmed && (
                                  <button
                                    onClick={handleConfirmContainer}
                                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm shadow-sm flex items-center"
                                  >
                                    <CheckSquare size={16} className="mr-1.5" />
                                    Confirm Container
                                  </button>
                                )}
                              {isContainerConfirmed && (
                                <button
                                  onClick={handleEditContainer}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm shadow-sm flex items-center"
                                >
                                  <CornerDownLeft
                                    size={16}
                                    className="mr-1.5"
                                  />
                                  Edit Container Selector
                                </button>
                              )}
                            </div>

                            {/* Author & Content Selectors (Sample-Based) */}
                            {isContainerConfirmed && (
                              <div className="space-y-4 pt-4 border-t border-gray-300">
                                <div className="flex justify-between items-center">
                                  <h5 className="text-md font-semibold text-gray-700">
                                    Author & Content Selectors (Sample-Based)
                                  </h5>
                                  <label className="flex items-center space-x-1.5 text-xs text-gray-600 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={autoHighlightInferred}
                                      onChange={(e) =>
                                        setAutoHighlightInferred(
                                          e.target.checked
                                        )
                                      }
                                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 h-3.5 w-3.5"
                                    />
                                    <span>Auto-highlight inferred</span>
                                  </label>
                                </div>

                                {/* Author Sampling */}
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                                  <p className="text-sm font-medium text-blue-700">
                                    Author Samples ({authorSamples.length}/
                                    {MAX_INITIAL_SAMPLES})
                                  </p>
                                  {authorSamples.map((sample, i) => (
                                    <div
                                      key={`author-s-${i}`}
                                      className="text-xs p-1 bg-blue-100 rounded truncate"
                                      title={sample.textPreview}
                                    >
                                      Sample {i + 1}: {sample.textPreview} (ID:{" "}
                                      {sample.id.substring(0, 10)}...)
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => startSampling("author")}
                                    disabled={
                                      (currentSamplingTarget !== null &&
                                        currentSamplingTarget !== "author") ||
                                      (authorSamples.length >=
                                        MAX_INITIAL_SAMPLES &&
                                        currentSamplingTarget !== "author")
                                    }
                                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-2 rounded flex items-center disabled:opacity-50"
                                  >
                                    <MousePointerClick
                                      size={14}
                                      className="mr-1"
                                    />
                                    {authorSampleButtonText}
                                  </button>
                                  {currentSamplingTarget === "author" && (
                                    <p className="text-xs text-orange-600 italic">
                                      Click an author name in the preview above.
                                      ({nextSampleIndex + 1}/
                                      {MAX_INITIAL_SAMPLES})
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <input
                                      type="text"
                                      value={helperSelectors.author}
                                      onChange={(e) =>
                                        handleHelperSelectorChange(
                                          "author",
                                          e.target.value
                                        )
                                      }
                                      className={`w-full p-1.5 border rounded-md text-xs shadow-sm ${incorrectHelperFields.author
                                        ? "border-red-400 bg-red-50"
                                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                        }`}
                                      placeholder="Author CSS selector (or infer)"
                                    />
                                    <button
                                      onClick={() =>
                                        handleMarkIncorrectHelperField("author")
                                      }
                                      title="Clear author selector"
                                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 text-xs disabled:opacity-50"
                                      disabled={!helperSelectors.author}
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  </div>
                                  {rawAuthorSelectors.length > 0 && (
                                    <CollapsibleSection
                                      title={`Raw Author Candidates (${rawAuthorSelectors.length})`}
                                      icon={<ClipboardList size={14} />}
                                      initiallyCollapsed={true}
                                      headerClassName="text-xs py-1 px-2 bg-blue-100 hover:bg-blue-200"
                                      contentClassName="text-xs p-1"
                                    >
                                      <ul className="list-disc list-inside max-h-40 overflow-y-auto p-1 space-y-0.5 bg-white border border-blue-200 rounded">
                                        {rawAuthorSelectors.map((s, i) => (
                                          <li
                                            key={i}
                                            className="font-mono text-[11px] break-all cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                                            onClick={() =>
                                              handleHelperSelectorChange(
                                                "author",
                                                s
                                              )
                                            }
                                            title="Click to use this selector"
                                          >
                                            {s}
                                          </li>
                                        ))}
                                      </ul>
                                    </CollapsibleSection>
                                  )}
                                </div>

                                {/* Content Sampling */}
                                <div className="p-3 bg-green-50 border border-green-200 rounded-md space-y-2">
                                  <p className="text-sm font-medium text-green-700">
                                    Content Samples ({contentSamples.length}/
                                    {canAddMoreContentSamples
                                      ? ABSOLUTE_MAX_CONTENT_SAMPLES
                                      : MAX_INITIAL_SAMPLES}
                                    )
                                  </p>
                                  {contentSamples.map((sample, i) => (
                                    <div
                                      key={`content-s-${i}`}
                                      className="text-xs p-1 bg-green-100 rounded truncate"
                                      title={sample.textPreview}
                                    >
                                      Sample {i + 1}: {sample.textPreview} (ID:{" "}
                                      {sample.id.substring(0, 10)}...)
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => startSampling("content")}
                                    disabled={
                                      (currentSamplingTarget !== null &&
                                        currentSamplingTarget !== "content") ||
                                      (isContentSamplingMaxed &&
                                        currentSamplingTarget !== "content")
                                    }
                                    className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded flex items-center disabled:opacity-50"
                                  >
                                    {canAddMoreContentSamples &&
                                      contentSamples.length <
                                      ABSOLUTE_MAX_CONTENT_SAMPLES ? (
                                      <Plus size={14} className="mr-1" />
                                    ) : (
                                      <MousePointerClick
                                        size={14}
                                        className="mr-1"
                                      />
                                    )}
                                    {contentSampleButtonText}
                                  </button>
                                  {currentSamplingTarget === "content" && (
                                    <p className="text-xs text-orange-600 italic">
                                      Click a message text in the preview above.
                                      ({nextSampleIndex + 1}/
                                      {canAddMoreContentSamples
                                        ? ABSOLUTE_MAX_CONTENT_SAMPLES
                                        : MAX_INITIAL_SAMPLES}
                                      )
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <input
                                      type="text"
                                      value={helperSelectors.content}
                                      onChange={(e) =>
                                        handleHelperSelectorChange(
                                          "content",
                                          e.target.value
                                        )
                                      }
                                      className={`w-full p-1.5 border rounded-md text-xs shadow-sm ${incorrectHelperFields.content
                                        ? "border-red-400 bg-red-50"
                                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                        }`}
                                      placeholder="Content CSS selector (or infer)"
                                    />
                                    <button
                                      onClick={() =>
                                        handleMarkIncorrectHelperField(
                                          "content"
                                        )
                                      }
                                      title="Clear content selector"
                                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 text-xs disabled:opacity-50"
                                      disabled={!helperSelectors.content}
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  </div>
                                  {rawContentSelectors.length > 0 && (
                                    <CollapsibleSection
                                      title={`Raw Content Candidates (${rawContentSelectors.length})`}
                                      icon={<ClipboardList size={14} />}
                                      initiallyCollapsed={true}
                                      headerClassName="text-xs py-1 px-2 bg-green-100 hover:bg-green-200"
                                      contentClassName="text-xs p-1"
                                    >
                                      <ul className="list-disc list-inside max-h-40 overflow-y-auto p-1 space-y-0.5 bg-white border border-green-200 rounded">
                                        {rawContentSelectors.map((s, i) => (
                                          <li
                                            key={i}
                                            className="font-mono text-[11px] break-all cursor-pointer hover:bg-green-100 p-0.5 rounded"
                                            onClick={() =>
                                              handleHelperSelectorChange(
                                                "content",
                                                s
                                              )
                                            }
                                            title="Click to use this selector"
                                          >
                                            {s}
                                          </li>
                                        ))}
                                      </ul>
                                    </CollapsibleSection>
                                  )}
                                </div>
                                <button
                                  onClick={inferSelectorsFromSamples}
                                  disabled={!canInferFromSamples}
                                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm shadow-sm flex items-center justify-center disabled:opacity-50"
                                >
                                  <Sparkles size={16} className="mr-1.5" />
                                  Infer Author & Content from Samples
                                </button>
                              </div>
                            )}

                            {/* Apply and Mock Preview */}
                            <button
                              onClick={applyHelperSelectorsToSite}
                              className="mt-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm shadow-sm w-full flex items-center justify-center"
                              disabled={!helperSelectors.container} // Require container to apply
                            >
                              <CheckCircle size={16} className="mr-1.5" /> Apply
                              Selectors to Site Config
                            </button>

                            {mockChatData && (
                              <div className="mt-3 p-3 border border-gray-300 rounded-md bg-gray-50 shadow-inner space-y-1.5">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">
                                  Extracted Text Preview:
                                </h5>
                                <div
                                  className={`p-2 rounded-md text-xs ${mockChatData.containerSelectorValid
                                    ? "bg-blue-50 border-blue-200 border"
                                    : helperSelectors.container
                                      ? "bg-red-50 border-red-200 border"
                                      : "bg-gray-100 border-gray-200 border"
                                    }`}
                                >
                                  <span className="font-medium">
                                    Container:{" "}
                                  </span>
                                  <code className="text-xs break-all">
                                    {helperSelectors?.container || "N/A"}
                                  </code>
                                  {helperSelectors.container &&
                                    (mockChatData.containerSelectorValid ? (
                                      <span className="text-green-600 font-semibold ml-1">
                                        (Found)
                                      </span>
                                    ) : (
                                      <span className="text-red-600 font-semibold ml-1">
                                        (Not Found/Invalid)
                                      </span>
                                    ))}
                                </div>
                                {(isContainerConfirmed ||
                                  mockChatData.containerSelectorValid) && (
                                    <>
                                      <div
                                        className={`p-2 rounded-md text-xs ${mockChatData.authorSelectorValid
                                          ? "bg-green-50 border-green-200 border"
                                          : helperSelectors.author
                                            ? "bg-red-50 border-red-200 border"
                                            : "bg-gray-100 border-gray-200 border"
                                          }`}
                                      >
                                        <strong className="text-gray-700">
                                          Author:{" "}
                                        </strong>
                                        <span className="text-gray-800 italic">
                                          {mockChatData.author}
                                        </span>
                                        <br />
                                        <small className="text-gray-500">
                                          Selector:{" "}
                                          <code className="text-xs break-all">
                                            {helperSelectors?.author || "N/A"}
                                          </code>
                                          {helperSelectors.author &&
                                            (mockChatData.authorSelectorValid ? (
                                              <span className="text-green-600 font-semibold ml-1">
                                                (Found)
                                              </span>
                                            ) : (
                                              <span className="text-red-600 font-semibold ml-1">
                                                (Not Found/Invalid)
                                              </span>
                                            ))}
                                        </small>
                                      </div>
                                      <div
                                        className={`p-2 rounded-md text-xs ${mockChatData.contentSelectorValid
                                          ? "bg-green-50 border-green-200 border"
                                          : helperSelectors.content
                                            ? "bg-red-50 border-red-200 border"
                                            : "bg-gray-100 border-gray-200 border"
                                          }`}
                                      >
                                        <strong className="text-gray-700">
                                          Content:{" "}
                                        </strong>
                                        <span className="text-gray-800 italic">
                                          {mockChatData.content}
                                        </span>
                                        <br />
                                        <small className="text-gray-500">
                                          Selector:{" "}
                                          <code className="text-xs break-all">
                                            {helperSelectors?.content || "N/A"}
                                          </code>
                                          {helperSelectors.content &&
                                            (mockChatData.contentSelectorValid ? (
                                              <span className="text-green-600 font-semibold ml-1">
                                                (Found)
                                              </span>
                                            ) : (
                                              <span className="text-red-600 font-semibold ml-1">
                                                (Not Found/Invalid)
                                              </span>
                                            ))}
                                        </small>
                                      </div>
                                    </>
                                  )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic text-center py-4">
                  No sites configured. Add one to get started!
                </p>
              )}
            </div>
          </CollapsibleSection>
        </div>
        <div className="space-y-6 md:space-y-8">
          <CollapsibleSection
            title="Statistics"
            icon={<BarChart2 size={20} />}
            initiallyCollapsed={collapsedSections.statistics}
            onToggle={() => toggleMainSection("statistics")}
          >
            <div className="space-y-3 text-gray-600">
              <p>
                <strong className="font-medium text-gray-700">
                  Configured Sites:
                </strong>{" "}
                {stats.siteCount}
              </p>
              <p>
                <strong className="font-medium text-gray-700">
                  Unique Blocked Users (from history):
                </strong>{" "}
                {stats.uniqueUsers}
              </p>
              <div>
                <strong className="font-medium text-gray-700">
                  Top 3 Blocked Users (from history):
                </strong>
                {stats.topUsers.length > 0 ? (
                  <ul className="list-disc list-inside ml-4 mt-1 text-sm">
                    {stats.topUsers.map((u) => (
                      <li key={u.name}>
                        {u.name}:{" "}
                        <span className="font-semibold">{u.count}</span> block
                        {u.count > 1 ? "s" : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="italic text-sm"> No data.</span>
                )}
              </div>
            </div>
          </CollapsibleSection>
          <CollapsibleSection
            title="Recent Blocked Messages"
            icon={<AlertTriangle size={20} className="text-orange-500" />}
            initiallyCollapsed={collapsedSections.messageLog}
            onToggle={() => toggleMainSection("messageLog")}
            contentClassName="max-h-[500px] overflow-y-auto pr-2" // Added pr-2 for scrollbar spacing
          >
            {blockedMessages.length === 0 ? (
              <p className="text-gray-500 italic">
                No messages blocked recently.
              </p>
            ) : (
              <div className="space-y-4">
                {blockedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="border-b border-gray-200 pb-3 text-sm text-gray-600 last:border-b-0"
                  >
                    <p className="font-semibold text-gray-800">
                      {msg.author}{" "}
                      <span className="text-xs text-gray-500 font-normal">
                        on {config?.sites[msg.site]?.label || msg.site}
                      </span>
                    </p>
                    <p
                      className="text-xs break-all"
                      title={msg.originalContent}
                    >
                      <strong className="text-gray-500">Original:</strong>{" "}
                      {msg.originalContent}
                    </p>
                    <p
                      className="text-xs text-red-600 break-all"
                      title={msg.clappedContent}
                    >
                      <strong className="text-red-500">Blocked As:</strong>{" "}
                      {msg.clappedContent}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>ChatClapper Userscript Dashboard</p>
      </footer>
    </div>
  );
};

export default Dashboard;