export type ClinicalOutput = {
  clinical_history: string;
  exam_reason: string;
  patient_age_group: string;
  patient_sex: 'M' | 'F' | 'O';
};

export type TechnicalOutput = {
  equipment: string;
  protocol: string;
  contrast: {
    used: boolean;
    type?: string;
    volume_ml?: number;
    phases?: string[];
  };
};

export type FindingsOutput = {
  findings: Array<{
    finding_id?: string;
    organ: string;
    description: string;
    measurements?: Array<{
      label: string;
      value: number;
      unit: string;
    }>;
    compute_requests?: Array<{
      formula: string;
      inputs: Record<string, unknown>;
      ref_id: string;
    }>;
  }>;
};

export type ImpressionOutput = {
  primary_diagnosis: string;
  differentials?: string[];
  recommendations?: string[];
};

export type ComparisonOutput = {
  summary: string;
  mode?: string;
  limitations?: string[];
};
