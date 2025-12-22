#!/usr/bin/env bash

set -e

JSON_DIR="src/data/json"
RAG_CASES_DIR="rag/cases"

echo "📦 Creando estructura RAG a partir de JSONs..."
echo "📂 Origen: $JSON_DIR"

# Comprobación básica
if [ ! -d "$JSON_DIR" ]; then
  echo "❌ No existe el directorio $JSON_DIR"
  exit 1
fi

mkdir -p "$RAG_CASES_DIR"

# Recorremos cada JSON
for file in "$JSON_DIR"/*.json; do
  # Si no hay JSONs, salimos limpiamente
  [ -e "$file" ] || continue

  case_id=$(basename "$file" .json)
  case_dir="$RAG_CASES_DIR/$case_id"

  echo "🧠 Creando caso: $case_id"

  mkdir -p "$case_dir/docs"

  # Archivos base
  touch "$case_dir/docs/contexto.md"
  touch "$case_dir/docs/reglas_mundo.md"
  touch "$case_dir/docs/personajes.md"
  touch "$case_dir/timeline.json"
  touch "$case_dir/memory.jsonl"

done

# Estructura común (una sola vez)
mkdir -p rag/index/chroma
mkdir -p rag/scripts
mkdir -p rag/server
mkdir -p rag/client

touch rag/scripts/build_index.mjs
touch rag/server/chunker.mjs
touch rag/server/ragStore.mjs
touch rag/server/prompts.mjs
touch rag/server/llmAdapter.mjs
touch rag/server/routes.story.mjs
touch rag/client/StoryPanel.svelte

echo "✅ Estructura RAG generada desde JSONs"
