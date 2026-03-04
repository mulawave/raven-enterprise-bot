export type FeatureInput = {
  text?: string
  intent?: string
  entities?: Record<string, any>
  timestamp?: Date
  userId?: string
  tenantId?: string
}

export type FeatureVector = Record<string, number | string>

export class FeatureExtractor {
  extract(input: FeatureInput): FeatureVector {
    const features: FeatureVector = {}
    if (input.text) features.text_length = input.text.length
    if (input.intent) features.intent = input.intent
    if (input.entities) features.entity_count = Object.keys(input.entities).length
    if (input.timestamp) features.hour = input.timestamp.getHours()
    if (input.userId) features.userId = input.userId
    if (input.tenantId) features.tenantId = input.tenantId
    return features
  }
}
