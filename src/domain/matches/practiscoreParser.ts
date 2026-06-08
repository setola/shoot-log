import type { PractiscoreCompetitor, PractiscoreMatchSnapshot, PractiscoreStage, PractiscoreStageScore } from './practiscoreTypes';

const REQUIRED_XML_FILES = ['THEMATCH.XML', 'STAGE.XML', 'MEMBER.XML', 'ENROLLED.XML', 'SCORE.XML'] as const;

export function normalizePractiscoreMatchId(value: string): string {
  const decoded = decodeURIComponent(value.trim());
  const uuidMatch = decoded.match(/[({]?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[)}]?/i);
  return uuidMatch ? uuidMatch[1].toUpperCase() : decoded.replace(/[{}]/g, '').trim().toUpperCase();
}

export async function parsePractiscoreCabSnapshot(file: File, practiscoreMatchIdInput: string): Promise<PractiscoreMatchSnapshot> {
  const practiscoreMatchId = normalizePractiscoreMatchId(practiscoreMatchIdInput);
  const files = extractCabFiles(await file.arrayBuffer());
  const rawXml: Record<string, string> = {};

  for (const requiredFile of REQUIRED_XML_FILES) {
    const content = files.get(requiredFile);
    if (!content) {
      throw new Error(`Missing ${requiredFile} in PractiScore download.`);
    }
    rawXml[requiredFile] = content;
  }

  return parsePractiscoreXmlSnapshot(rawXml, practiscoreMatchId, file.name);
}

export function parsePractiscoreXmlSnapshot(rawXml: Record<string, string>, practiscoreMatchId: string, sourceFileName: string): PractiscoreMatchSnapshot {
  const importedAt = new Date().toISOString();
  const matchRow = parseRows(rawXml['THEMATCH.XML'] ?? '')[0];
  if (!matchRow) {
    throw new Error('THEMATCH.XML does not contain match data.');
  }

  const stages = parseRows(rawXml['STAGE.XML'] ?? '').map<PractiscoreStage>((row) => ({
    internalStageId: stringValue(row.StageId),
    name: stringValue(row.StageName) || `Stage ${stringValue(row.StageId)}`,
    minRounds: numberValue(row.MinRounds),
    maxPoints: numberValue(row.MaxPoints),
    courseId: optionalString(row.CourseId)
  }));

  const membersById = new Map(parseRows(rawXml['MEMBER.XML'] ?? '').map((row) => [stringValue(row.MemberId), row]));

  const competitors = parseRows(rawXml['ENROLLED.XML'] ?? '').map<PractiscoreCompetitor>((row) => {
    const member = membersById.get(stringValue(row.MemberId));
    const firstName = optionalString(member?.Firstname);
    const lastName = optionalString(member?.Lastname);
    const displayName = [lastName, firstName].filter(Boolean).join(' ') || `Member ${stringValue(row.MemberId)}`;

    return {
      internalMemberId: stringValue(row.MemberId),
      competitorNumber: optionalString(row.CompId),
      firstName,
      lastName,
      displayName,
      alias: optionalString(member?.IcsAlias),
      divisionId: optionalString(row.DivId),
      categoryId: optionalString(row.CatId),
      squadId: optionalString(row.SquadId),
      disqualified: booleanValue(row.IsDisq)
    };
  });

  const scores = parseRows(rawXml['SCORE.XML'] ?? '').map<PractiscoreStageScore>((row) => ({
    internalStageId: stringValue(row.StageId),
    internalMemberId: stringValue(row.MemberId),
    scoreA: numberValue(row.ScoreA),
    scoreB: numberValue(row.ScoreB),
    scoreC: numberValue(row.ScoreC),
    scoreD: numberValue(row.ScoreD),
    misses: numberValue(row.Misses),
    penalties: numberValue(row.Penalties),
    procedurals: numberValue(row.ProcError),
    shootTime: numberValue(row.ShootTime),
    hitFactor: numberValue(row.HitFactor),
    finalScore: numberValue(row.FinalScore),
    disqualified: booleanValue(row.IsDisq),
    removed: booleanValue(row.Remove),
    noVerify: booleanValue(row.NoVerify)
  }));

  return {
    practiscoreMatchId,
    importedAt,
    sourceFileName,
    match: {
      internalMatchId: stringValue(matchRow.MatchId),
      name: stringValue(matchRow.MatchName),
      date: stringValue(matchRow.MatchDt).slice(0, 10),
      level: optionalString(matchRow.MatchLevel),
      countryId: optionalString(matchRow.CountryId),
      firearmId: optionalString(matchRow.FirearmId),
      squadCount: numberValue(matchRow.SquadCount)
    },
    stages,
    competitors,
    scores,
    rawXml
  };
}

function parseRows(xml: string): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  const rowRegex = /<z:row\s+([^>]*?)\/?\s*>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRegex = /([\w:]+)='([^']*)'/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(rowMatch[1])) !== null) {
      attrs[attrMatch[1]] = decodeXmlEntities(attrMatch[2]);
    }

    rows.push(attrs);
  }

  return rows;
}

function extractCabFiles(buffer: ArrayBuffer): Map<string, string> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const signature = text(bytes, 0, 4);
  if (signature !== 'MSCF') {
    throw new Error('PractiScore download is not a CAB file.');
  }

  const fileCount = view.getUint16(28, true);
  const flags = view.getUint16(30, true);
  let offset = 36;

  if (flags & 0x0004) {
    const headerReserved = view.getUint16(offset, true);
    const folderReserved = view.getUint8(offset + 2);
    const dataReserved = view.getUint8(offset + 3);
    offset += 4 + headerReserved;
    if (folderReserved || dataReserved) {
      throw new Error('CAB reserved areas are not supported yet.');
    }
  }

  const folderDataOffset = view.getUint32(offset, true);
  const dataBlockCount = view.getUint16(offset + 4, true);
  const compressionType = view.getUint16(offset + 6, true) & 0x000f;
  if (compressionType !== 0) {
    throw new Error('Compressed CAB downloads are not supported yet.');
  }

  const filesOffset = offset + 8;
  const files: Array<{ name: string; size: number; folderOffset: number }> = [];
  offset = filesOffset;

  for (let i = 0; i < fileCount; i += 1) {
    const size = view.getUint32(offset, true);
    const folderOffset = view.getUint32(offset + 4, true);
    offset += 16;
    const nameEnd = bytes.indexOf(0, offset);
    const name = text(bytes, offset, nameEnd - offset).toUpperCase();
    offset = nameEnd + 1;
    files.push({ name, size, folderOffset });
  }

  const folderBytes = new Uint8Array(files.reduce((max, file) => Math.max(max, file.folderOffset + file.size), 0));
  let writeOffset = 0;
  offset = folderDataOffset;

  for (let i = 0; i < dataBlockCount; i += 1) {
    const compressedSize = view.getUint16(offset + 4, true);
    const uncompressedSize = view.getUint16(offset + 6, true);
    offset += 8;
    folderBytes.set(bytes.slice(offset, offset + compressedSize), writeOffset);
    writeOffset += uncompressedSize;
    offset += compressedSize;
  }

  const decoder = new TextDecoder('utf-8');
  return new Map(files.map((file) => [file.name, decoder.decode(folderBytes.slice(file.folderOffset, file.folderOffset + file.size))]));
}

function text(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder('ascii').decode(bytes.slice(offset, offset + length));
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

function stringValue(value: string | undefined): string {
  return value?.trim() ?? '';
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function numberValue(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanValue(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true';
}
