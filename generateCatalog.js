#!/usr/bin/env node
/**
 * Reads openapi.json (Scrape Creators API) and writes frontend/src/config/apiCatalog.js
 * Run from repo root: node generateCatalog.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SPEC_PATH = path.join(ROOT, 'openapi.json');
const OUT_PATH = path.join(ROOT, 'frontend', 'src', 'config', 'apiCatalog.js');

function slugTag(tag) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function pathToEndpointId(p) {
  return p
    .replace(/^\//, '')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
}

function labelize(name) {
  if (!name) return '';
  const s = String(name).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function openApiParamToField(param) {
  const schema = param.schema || {};
  const name = param.name;
  const label = labelize(name);
  const required = !!param.required;
  const desc = param.description || '';
  const example =
    param.example !== undefined
      ? param.example
      : schema.example !== undefined
        ? schema.example
        : '';

  /* Deskripsi panjang hanya untuk tooltip (!); label pendek = nama field saja */
  const description = desc ? desc.slice(0, 400) : '';

  if (schema.enum && Array.isArray(schema.enum)) {
    const opts = schema.enum.map((v) => String(v));
    const oset = new Set(opts.map((x) => x.toLowerCase()));
    const isBoolEnum = opts.length === 2 && oset.has('true') && oset.has('false');
    if (isBoolEnum) {
      const def =
        schema.default !== undefined ? String(schema.default) : undefined;
      return {
        name,
        description,
        kind: 'boolean',
        label,
        type: 'select',
        options: ['true', 'false'],
        required,
        default:
          def === 'true' || def === 'True'
            ? 'true'
            : def === 'false' || def === 'False'
              ? 'false'
              : undefined,
      };
    }
    const def = schema.default !== undefined ? String(schema.default) : undefined;
    return {
      name,
      description,
      label,
      type: 'select',
      options: opts,
      required,
      default: def,
    };
  }

  if (schema.type === 'boolean') {
    return {
      name,
      description,
      kind: 'boolean',
      label,
      type: 'select',
      options: ['true', 'false'],
      required,
      default:
        schema.default === true
          ? 'true'
          : schema.default === false
            ? 'false'
            : undefined,
    };
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    return {
      name,
      description,
      label,
      type: 'number',
      placeholder: example !== '' ? String(example) : '',
      required,
      default:
        schema.default !== undefined ? String(schema.default) : undefined,
    };
  }

  const low = name.toLowerCase();
  const inputType =
    low.includes('url') || low === 'link' ? 'url' : 'text';

  return {
    name,
    description,
    label,
    type: inputType,
    placeholder:
      inputType === 'url'
        ? 'https://...'
        : example !== ''
          ? String(example)
          : '',
    required,
    default: schema.default !== undefined ? String(schema.default) : undefined,
  };
}

function main() {
  const raw = fs.readFileSync(SPEC_PATH, 'utf8');
  const spec = JSON.parse(raw);
  const paths = spec.paths || {};

  const tagOrder = (spec.tags || []).map((t) => t.name);
  const tagSet = new Set(tagOrder);

  /** @type {Record<string, { name: string, endpoints: any[] }>} */
  const byTag = {};

  for (const tag of tagOrder) {
    byTag[tag] = { name: tag, endpoints: [] };
  }

  for (const [routePath, methods] of Object.entries(paths)) {
    const op = methods.get;
    if (!op || !op.tags || !op.tags.length) continue;

    const primaryTag = op.tags[0];
    if (!byTag[primaryTag]) {
      byTag[primaryTag] = { name: primaryTag, endpoints: [] };
      tagSet.add(primaryTag);
    }

    const parameters = (op.parameters || []).filter(
      (p) => p.in === 'query' || p.in === 'path'
    );
    const fields = parameters.map(openApiParamToField);

    byTag[primaryTag].endpoints.push({
      id: pathToEndpointId(routePath),
      name: op.summary || pathToEndpointId(routePath),
      method: 'GET',
      path: routePath,
      description: op.description || op.summary || '',
      parameters: fields,
    });
  }

  const orderedTags = [
    ...tagOrder.filter((t) => byTag[t] && byTag[t].endpoints.length),
    ...[...tagSet].filter(
      (t) =>
        !tagOrder.includes(t) && byTag[t] && byTag[t].endpoints.length
    ),
  ].filter((t, i, a) => a.indexOf(t) === i);

  /** @type {Record<string, any>} */
  const catalog = {};
  for (const tag of orderedTags) {
    const slug = slugTag(tag);
    const { endpoints } = byTag[tag];
    endpoints.sort((a, b) => a.path.localeCompare(b.path));
    catalog[slug] = {
      id: slug,
      name: `${tag} (v2 API)`,
      tag,
      colorIndex: orderedTags.indexOf(tag),
      endpoints,
    };
  }

  const header = `/**
 * AUTO-GENERATED by /generateCatalog.js — do not edit by hand.
 * Source: openapi.json (Scrape Creators API)
 * Generated: ${new Date().toISOString()}
 */
`;

  const meta = {
    generatedAt: new Date().toISOString(),
    platformCount: orderedTags.length,
    endpointCount: orderedTags.reduce(
      (n, t) => n + byTag[t].endpoints.length,
      0
    ),
    source: 'openapi.json',
  };

  const fixedBody = `export const apiCatalog = ${JSON.stringify(catalog, null, 4)};

export const catalogMeta = ${JSON.stringify(meta, null, 4)};
`;

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, header + fixedBody, 'utf8');

  const BACKEND_META = path.join(ROOT, 'backend', 'data', 'catalog-meta.json');
  fs.mkdirSync(path.dirname(BACKEND_META), { recursive: true });
  fs.writeFileSync(
    BACKEND_META,
    JSON.stringify(
      {
        v2PlatformCount: meta.platformCount,
        endpointCount: meta.endpointCount,
        legacyCount: 5,
        generatedAt: meta.generatedAt,
      },
      null,
      2
    ),
    'utf8'
  );

  console.error(
    `Wrote ${OUT_PATH} (${meta.platformCount} platforms, ${meta.endpointCount} endpoints)`
  );
}

main();
