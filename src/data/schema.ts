import { z } from 'zod';

/**
 * NextCycle data contract. Every JSON file in public/data/ is validated
 * against these schemas at load time. TypeScript types are derived from them.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date as YYYY-MM-DD');

export const FLAG_VALUES = ['Delisting candidate', 'Still exceeding', 'Under-sampled'] as const;
export const FlagSchema = z.enum(FLAG_VALUES);
export const PollutantGroupSchema = z.enum(['Metals', 'Nutrients', 'Conventional', 'Toxicity', 'Other']);
export const WaterbodyTypeSchema = z.enum(['River/Stream', 'Lake/Reservoir', 'Bay/Harbor', 'Coastal', 'Lagoon/Estuary']);
export const DataStatusSchema = z.enum(['illustrative', 'provisional', 'reviewed']);
export type DataStatus = z.infer<typeof DataStatusSchema>;
/** upper: result must not exceed criterion_value. lower: must not fall below. range: must stay within [criterion_value, criterion_value_upper]. */
export const CriterionDirectionSchema = z.enum(['upper', 'lower', 'range']);

const Position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const GeometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('LineString'), coordinates: z.array(Position).min(2) }),
  z.object({ type: z.literal('MultiLineString'), coordinates: z.array(z.array(Position).min(2)).min(1) }),
  z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(Position).min(4)).min(1) }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(z.array(Position).min(4)).min(1)).min(1) }),
]);

export const MetadataSchema = z.object({
  dataset_version: z.string().min(1),
  repo_url: z.string().url().optional(),
  site_url: z.string().url().optional(),
  license: z.string().min(1).optional(),
  data_status: DataStatusSchema,
  is_sample_data: z.boolean(),
  review_complete: z.boolean().optional(),
  qa_rule_version: z.string().min(1).optional(),
  generated_at: z.string().datetime({ offset: true }),
  monitoring_data_through: isoDate,
  cutoff_date: isoDate,
  next_cycle: z.string().min(1),
  regions: z.array(z.object({ region_id: z.string().min(1), region_name: z.string().min(1) })).min(1),
  sources: z.array(z.object({ name: z.string().min(1), publisher: z.string().min(1), url: z.string().url() })),
});

export const WaterbodyPairSchema = z
  .object({
    pair_id: z.string().min(1),
    waterbody_id: z.string().min(1),
    waterbody_name: z.string().min(1),
    waterbody_type: WaterbodyTypeSchema,
    region_id: z.string().min(1),
    county: z.string().min(1),
    cities: z.array(z.string().min(1)).optional(),
    zip_codes: z.array(z.string().regex(/^\d{5}$/)).optional(),
    tribal_lands: z.array(z.string().min(1)).optional(),
    tribal_intersection_verified: z.boolean().optional(),
    community_source_url: z.string().url().optional(),
    centroid: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
    geometry: GeometrySchema,
    pollutant: z.string().min(1),
    pollutant_group: PollutantGroupSchema,
    official_status: z.enum(['Listed', 'Not listed']),
    official_category: z.enum(['5', '4a', '4b', '3', '2', '1']),
    official_cycle: z.union([z.literal(2024), z.literal(2026)]),
    decision_id: z.string().min(1),
    fact_sheet_url: z.string().url(),
    tmdl_status: z.enum(['TMDL required', 'TMDL adopted', 'Other control', 'None']),
    criterion_direction: CriterionDirectionSchema,
    criterion_value: z.number(),
    criterion_value_upper: z.number().nullable(),
    criterion_unit: z.string().min(1),
    criterion_basis: z.string().min(1),
    beneficial_uses: z.array(z.string()),
    listing_table: z.enum(['3.1', '3.2']),
    delisting_table: z.enum(['4.1', '4.2']),
    new_samples: z.number().int().nonnegative(),
    new_exceedances: z.number().int().nonnegative(),
    pending_new_samples: z.number().int().nonnegative().optional(),
    pending_numeric_outside_count: z.number().int().nonnegative().optional(),
    allowed_exceedances_for_delisting: z.number().int().nonnegative().nullable(),
    min_samples_for_delisting: z.union([z.literal(28), z.literal(26)]),
    screening_flag: FlagSchema,
    first_new_sample_date: isoDate.nullable(),
    last_sample_date: isoDate,
    station_count: z.number().int().nonnegative(),
    ces_percentile: z.number().min(0).max(100).nullable().optional(),
    disadvantaged_community: z.boolean().nullable().optional(),
    summary: z.string().min(1),
    data_gap_note: z.string().nullable(),
  })
  .superRefine((p, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${p.pair_id}: ${message}` });
    if (p.new_exceedances > p.new_samples) issue('new_exceedances cannot exceed new_samples');
    if (p.criterion_direction === 'range' && (p.criterion_value_upper === null || p.criterion_value_upper <= p.criterion_value))
      issue('range criteria need criterion_value_upper greater than criterion_value');
    if (p.criterion_direction !== 'range' && p.criterion_value_upper !== null) issue('criterion_value_upper must be null unless direction is range');
    const enough = p.new_samples >= p.min_samples_for_delisting;
    if (enough && p.allowed_exceedances_for_delisting === null) issue('allowed_exceedances_for_delisting is required when sample count meets the minimum');
    const expected = !enough ? 'Under-sampled' : p.new_exceedances <= (p.allowed_exceedances_for_delisting ?? 0) ? 'Delisting candidate' : 'Still exceeding';
    if (p.official_status === 'Listed' && expected !== p.screening_flag) issue(`screening_flag "${p.screening_flag}" disagrees with counts (expected "${expected}")`);
    if (p.ces_percentile != null && p.disadvantaged_community != null && p.disadvantaged_community !== (p.ces_percentile >= 75)) {
      issue('disadvantaged_community must equal ces_percentile >= 75');
    }
    if (p.disadvantaged_community === true && p.ces_percentile == null) issue('a disadvantaged-community flag requires a sourced percentile');
    if (p.pending_numeric_outside_count != null && p.pending_new_samples != null && p.pending_numeric_outside_count > p.pending_new_samples) {
      issue('pending numeric comparisons cannot exceed pending observations');
    }
    if (p.tribal_lands?.length && !p.tribal_intersection_verified) issue('Tribal intersections need verified source coverage');
  });

export const StationSchema = z.object({
  station_code: z.string().min(1),
  station_name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  waterbody_id: z.string().min(1),
  link_method: z.enum(['Fact sheet', 'Spatial join']),
  sample_count: z.number().int().nonnegative(),
  last_sample_date: isoDate,
});

export const SampleResultSchema = z.object({
  date: isoDate,
  station_code: z.string().min(1),
  value: z.number().nullable(),
  qualifier: z.string().min(1),
  exceeds: z.boolean(),
  before_cutoff: z.boolean(),
  screening_eligible: z.boolean(),
  qa_status: z.enum(['eligible', 'pending']).optional(),
  qa_note: z.string().optional(),
  source_sample_id: z.string().nullable().optional(),
  source_year: z.number().int().optional(),
  source_resource_id: z.string().optional(),
  source_unit: z.string().optional(),
  source_value: z.number().nullable().optional(),
  source_qualifier: z.string().nullable().optional(),
  analyte: z.string().optional(),
  sample_type: z.string().optional(),
  source_dataset: z.string().optional(),
  program: z.string().optional(),
  parent_project: z.string().optional(),
  project: z.string().optional(),
  data_quality: z.string().optional(),
  data_quality_indicator: z.string().optional(),
  qacode: z.string().nullable().optional(),
  matrix_name: z.string().optional(),
  source_station_name: z.string().optional(),
  source_observation: z.string().optional(),
  batch_verification: z.string().nullable().optional(),
  collection_replicate: z.number().nullable().optional(),
  results_replicate: z.number().nullable().optional(),
});

export const SampleFileSchema = z.object({
  pair_id: z.string().min(1),
  unit: z.string().min(1),
  criterion_direction: CriterionDirectionSchema,
  criterion_value: z.number(),
  criterion_value_upper: z.number().nullable(),
  results: z.array(SampleResultSchema),
});

export const AboutSchema = z.object({
  team: z.array(
    z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      bio: z.string().min(1),
    }),
  ).optional(),
  recognition: z.array(
    z.object({
      name: z.string().min(1),
      program: z.string().nullable().optional(),
      year: z.number().int().nullable().optional(),
      url: z.string().url().nullable().optional(),
      note: z.string().nullable().optional(),
    }),
  ),
});

export const WaterbodiesSchema = z.array(WaterbodyPairSchema);
export const StationsSchema = z.array(StationSchema);

export type Flag = z.infer<typeof FlagSchema>;
export type PollutantGroup = z.infer<typeof PollutantGroupSchema>;
export type WaterbodyType = z.infer<typeof WaterbodyTypeSchema>;
export type CriterionDirection = z.infer<typeof CriterionDirectionSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type WaterbodyPair = z.infer<typeof WaterbodyPairSchema>;
export type Station = z.infer<typeof StationSchema>;
export type SampleResult = z.infer<typeof SampleResultSchema>;
export type SampleFile = z.infer<typeof SampleFileSchema>;
export type About = z.infer<typeof AboutSchema>;

export interface Dataset {
  metadata: Metadata;
  pairs: WaterbodyPair[];
  stations: Station[];
  about: About;
}
