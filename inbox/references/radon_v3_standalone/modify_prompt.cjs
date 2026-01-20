const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'synthesis_prompt_v8.7.9_clean.md');
let content = fs.readFileSync(filePath, 'utf-8');

// Replacement 1: Steatosis
const steatosisTarget = `    *   Se valor médio de atenuação (HU) do parênquima hepático fornecido no input:

        *   Classificar grau: ≥ 57 HU (Ausência/Limite), 40–56 HU (Leve), 23–39 HU (Moderada), < 23 HU (Acentuada/Grave).

        *   No **Fígado**:

            ► Parênquima hepático apresenta atenuação média de [Valor HU do input] HU.

            ► Achado sugestivo de esteatose de grau [classificação calculada pela IA].`;

const steatosisFix = `    *   Se valor médio de atenuação (HU) do parênquima hepático fornecido no input:

        *   **NÃO CALCULAR.** Utilize a classificação já fornecida no objeto \`calculator_results\` (campo: \`steatosis_grade\`).

        *   No **Fígado**:

            ► Parênquima hepático apresenta atenuação média de [Valor HU do input] HU.

            ► Achado sugestivo de esteatose de grau [Valor de \`steatosis_grade\` do JSON].`;

// Replacement 2: Washout
const washoutTarget = `    *   Fórmula AWO%: 100 * (HU Pós - HU Tardio) / (HU Pós - HU Pré)

    *   Fórmula RWO%: 100 * (HU Pós - HU Tardio) / HU Pós`;

const washoutFix = `    *   **NÃO CALCULAR.** Utilize os valores de Washout Absoluto e Relativo já calculados e fornecidos no objeto \`calculator_results\`.`;

// Replacement 3: Splenomegaly
const spleenTarget = `    *   ULN Comp (cm) Fem: (0.0282 * Altura cm) + 7.5526; ULN Comp (cm) Masc: (0.0544 * Altura cm) + 3.6693

    *   ULN Vol (cm³) Fem: (7.0996 * Altura cm) - 939.5; ULN Vol (cm³) Masc: (4.3803 * Altura cm) - 457.15`;

const spleenFix = `    *   **NÃO CALCULAR.** Utilize os valores de ULN (Upper Limit of Normal) e Volume Estimado fornecidos no objeto \`calculator_results\` (\`splenic_data\`).`;


// Apply replacements
if (content.includes(steatosisTarget)) {
    content = content.replace(steatosisTarget, steatosisFix);
    console.log("Steatosis patched.");
} else {
    console.log("Steatosis target NOT found.");
}

if (content.includes(washoutTarget)) {
    content = content.replace(washoutTarget, washoutFix);
    console.log("Washout patched.");
} else {
    console.log("Washout target NOT found.");
}

if (content.includes(spleenTarget)) {
    content = content.replace(spleenTarget, spleenFix);
    console.log("Spleen patched.");
} else {
    console.log("Spleen target NOT found.");
}

fs.writeFileSync(filePath, content, 'utf-8');
