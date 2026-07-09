import { assessRequest } from "./scoring/bridge.js";
import { getMockCarbonData } from "./scoring/index.js";
import { detectBorrowerSegment } from "./scoring/thin-file.js";
import { enrichFinancialData } from "./integrations/enrichment.js";
import type { AssessmentRequest, AssessmentResult } from "./scoring/types.js";

export async function runEnrichedAssessment(
  request: AssessmentRequest,
  msmeId?: string,
): Promise<{ result: AssessmentResult; enrichment_log: Record<string, unknown> }> {
  let fd = request.financial_data;
  const profileMsmeId = msmeId ?? (fd.profile?.msme_id as string | undefined) ?? "unknown";

  let enrichmentLog: Record<string, unknown> = { applied: [], skipped: [] };

  if (request.auto_enrich !== false) {
    const alt = request.alternate_data ?? {};
    const enriched = await enrichFinancialData(fd, {
      msme_id: profileMsmeId,
      include_bureau: true,
      include_tax: true,
      include_aa: alt.include_aa ?? false,
      include_upi: alt.include_upi ?? false,
      include_epfo: alt.include_epfo ?? false,
      aa_session_id: alt.aa_session_id,
      upi_vpa: alt.upi_vpa,
      epfo_establishment_id: alt.epfo_establishment_id,
    });
    fd = enriched.financial_data;
    enrichmentLog = enriched.enrichment_log;
  }

  const thinFile = detectBorrowerSegment(fd);
  const carbon =
    request.include_carbon_intelligence !== false ? getMockCarbonData(profileMsmeId) : undefined;

  const result = await assessRequest(
    {
      ...request,
      financial_data: fd,
      thin_file_mode: request.thin_file_mode ?? thinFile.is_thin_file,
    },
    carbon,
    enrichmentLog,
  );

  return { result, enrichment_log: enrichmentLog };
}
