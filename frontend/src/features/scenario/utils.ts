export function parseScenarioContent(content: string) {
  const formulasMarker = "\n\nFormulas:\n";
  const assumptionsMarker = "\n\nAssumptions:\n";

  const formulasStart = content.indexOf(formulasMarker);
  const assumptionsStart = content.indexOf(assumptionsMarker);

  if (formulasStart === -1 && assumptionsStart === -1) {
    return {
      description: content.trim(),
      formulas: "",
      assumptions: ""
    };
  }

  const firstSectionIndex = [formulasStart, assumptionsStart]
    .filter((index) => index !== -1)
    .sort((left, right) => left - right)[0];

  const description = content.slice(0, firstSectionIndex).trim();

  let formulas = "";
  let assumptions = "";

  if (formulasStart !== -1) {
    const formulasContentStart = formulasStart + formulasMarker.length;
    const formulasContentEnd = assumptionsStart !== -1 && assumptionsStart > formulasStart ? assumptionsStart : content.length;
    formulas = content.slice(formulasContentStart, formulasContentEnd).trim();
  }

  if (assumptionsStart !== -1) {
    const assumptionsContentStart = assumptionsStart + assumptionsMarker.length;
    assumptions = content.slice(assumptionsContentStart).trim();
  }

  return { description, formulas, assumptions };
}

export function composeScenarioContent(description: string, formulas: string, assumptions: string) {
  return [
    description.trim(),
    formulas.trim() ? `Formulas:\n${formulas.trim()}` : "",
    assumptions.trim() ? `Assumptions:\n${assumptions.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}
