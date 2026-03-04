import { FeatureExtractor, FeatureInput, FeatureVector } from './feature.extractor'

export class TrainingDatasetBuilder {
  private readonly extractor = new FeatureExtractor()

  build(inputs: FeatureInput[]): FeatureVector[] {
    return inputs.map((input) => this.extractor.extract(input))
  }
}
