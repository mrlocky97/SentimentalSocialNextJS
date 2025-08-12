import natural from "natural";

export type SentimentLabel = "positive" | "negative" | "neutral";

export interface NaiveBayesTrainingExample {
  text: string;
  label: SentimentLabel;
}

export class NaiveBayesSentimentService {
  private classifier: natural.BayesClassifier;

  constructor() {
    this.classifier = new natural.BayesClassifier();
  }

  train(examples: NaiveBayesTrainingExample[]) {
    examples.forEach(({ text, label }) => {
      this.classifier.addDocument(text, label);
    });
    this.classifier.train();
  }

  predict(text: string): { label: SentimentLabel; confidence: number } {
    const classifications = this.classifier.getClassifications(text);
    if (classifications.length === 0) {
      return { label: "neutral", confidence: 0.5 };
    }
    const best = classifications[0];
    return {
      label: best.label as SentimentLabel,
      confidence: best.value,
    };
  }

  saveToFile(filePath: string) {
    this.classifier.save(filePath, (err) => {
      if (err) console.error("Error saving classifier:", err);
    });
  }

  loadFromFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      natural.BayesClassifier.load(filePath, null, (err, classifier) => {
        if (err || !classifier)
          return reject(err || new Error("Classifier not loaded"));
        this.classifier = classifier;
        resolve();
      });
    });
  }
}
