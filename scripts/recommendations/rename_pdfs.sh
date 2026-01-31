#!/bin/bash
# Rename PDFs to more descriptive names
# Execute na pasta raw_docs/

cd "$(dirname "$0")/../../data/recommendations/raw_docs" || exit 1

echo "🔄 Renomeando PDFs para nomes descritivos..."
echo ""

# European Radiology papers (s00330-*) - Manter mas adicionar prefixo
# Vou apenas adicionar prefixo ESGAR_ ou ESUR_ para facilitar agrupamento
for file in s00330-*.pdf; do
  if [ -f "$file" ]; then
    newname="esgar_${file}"
    if [ ! -f "$newname" ]; then
      cp "$file" "$newname"
      echo "✅ $file → $newname"
    fi
  fi
done

# European Radiology 2021 article
if [ -f "330_2021_Article_8384.pdf" ]; then
  cp "330_2021_Article_8384.pdf" "esgar_2021_article_8384.pdf"
  echo "✅ 330_2021_Article_8384.pdf → esgar_2021_article_8384.pdf"
fi

# PIIS files (Publisher Item Identifier System)
if [ -f "PIIS0959804922007511.pdf" ]; then
  cp "PIIS0959804922007511.pdf" "oncology_ejc_2022_radiotherapy.pdf"
  echo "✅ PIIS0959804922007511.pdf → oncology_ejc_2022_radiotherapy.pdf"
fi

if [ -f "PIIS1546144020313995.pdf" ]; then
  cp "PIIS1546144020313995.pdf" "clinical_imaging_2020.pdf"
  echo "✅ PIIS1546144020313995.pdf → clinical_imaging_2020.pdf"
fi

# JJA files
if [ -f "jjaf106.pdf" ]; then
  cp "jjaf106.pdf" "esur_guideline_106.pdf"
  echo "✅ jjaf106.pdf → esur_guideline_106.pdf"
fi

if [ -f "jjaf107.pdf" ]; then
  cp "jjaf107.pdf" "esur_guideline_107.pdf"
  echo "✅ jjaf107.pdf → esur_guideline_107.pdf"
fi

# Esteatose (já com espaço no nome, corrigir)
if [ -f "esteatose .pdf" ]; then
  cp "esteatose .pdf" "hepatic_steatosis_review.pdf"
  echo "✅ esteatose .pdf → hepatic_steatosis_review.pdf"
fi

# NAFLD JAMA
if [ -f "NAFLD-DIAGNOSIS-AND-MANAGEMENT-JAMA-artigo-5.pdf" ]; then
  cp "NAFLD-DIAGNOSIS-AND-MANAGEMENT-JAMA-artigo-5.pdf" "nafld_jama_2016.pdf"
  echo "✅ NAFLD-DIAGNOSIS-AND-MANAGEMENT-JAMA-artigo-5.pdf → nafld_jama_2016.pdf"
fi

echo ""
echo "✨ Renomeação concluída!"
echo ""
echo "📝 Nota: Arquivos originais foram MANTIDOS (usamos 'cp' não 'mv')"
echo "   Você pode deletar os originais depois de verificar"
