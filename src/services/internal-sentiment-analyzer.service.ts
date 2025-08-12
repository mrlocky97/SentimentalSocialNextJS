import { Language } from "../enums/sentiment.enum";
import { TextAnalysis } from "../types/sentiment";

export class InternalSentimentAnalyzer {
  analyze(text: string): Promise<TextAnalysis> {
    return new Promise((resolve) => {
      // Simplified rule-based sentiment analysis
      const lowerText = text.toLowerCase();

      // Positive words
      const positiveWords = [
        "good",
        "great",
        "excellent",
        "amazing",
        "love",
        "fantastic",
        "awesome",
        "perfect",
        "wonderful",
        "best",
        "bueno",
        "excelente",
        "increíble",
        "fantástico",
        "perfecto",
        "maravilloso",
        "mejor",
      ];
      // Negative words
      const negativeWords = [
        "bad",
        "terrible",
        "horrible",
        "hate",
        "worst",
        "awful",
        "disgusting",
        "pathetic",
        "useless",
        "fail",
        "malo",
        "terrible",
        "horrible",
        "odio",
        "peor",
        "fatal",
        "desastre",
      ];
      // Emoji sentiment map (más realista y variado)
      const emojiSentiment: Record<string, number> = {
        "😀": 1,
        "😃": 1,
        "😄": 1,
        "😁": 1,
        "😆": 0.8,
        "😊": 0.8,
        "😍": 1,
        "🥰": 1,
        "😇": 0.7,
        "😎": 0.7,
        "👍": 0.7,
        "❤️": 1,
        "💖": 1,
        "🤩": 1,
        "🥳": 1,
        "�😂": 0.5,
        "😅": 0.5,
        "😜": 0.5,
        "😋": 0.5,
        "😌": 0.5,
        "😻": 0.5,
        "😽": 0.5,
        "😸": 0.5,
        "😹": 0.5,
        "😺": 0.5,
        "😢": -1,
        "😭": -1,
        "😞": -0.8,
        "😔": -0.8,
        "😡": -1,
        "😠": -1,
        "😤": -0.8,
        "👎": -0.7,
        "💔": -1,
        "😩": -0.8,
        "😫": -0.8,
        "😱": -0.7,
        "😨": -0.7,
        "😰": -0.7,
        "😓": -0.7,
        "😬": -0.5,
        "�😑": -0.3,
        "�😶": -0.3,
        "😿": -0.5,
        "🙀": -0.5,
        "🤔": 0,
        "😏": 0,
        "😳": 0,
        "😮": 0,
        "😯": 0,
        "😲": 0,
        "😴": 0,
        "😪": 0,
        "�‍🌫️": 0,
        "😐": 0,
        "😑": 0,
        "😶": 0,
      };
      let positiveScore = 0,
        negativeScore = 0,
        emojiScore = 0,
        emojiCount = 0,
        positiveEmojiCount = 0,
        negativeEmojiCount = 0;
      positiveWords.forEach((word) => {
        if (lowerText.includes(word)) positiveScore++;
      });
      negativeWords.forEach((word) => {
        if (lowerText.includes(word)) negativeScore++;
      });
      const emojiMatches = Array.from(
        text.matchAll(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}|\u{1F0CF}|\u{1F170}-\u{1F171}|\u{1F17E}-\u{1F17F}|\u{1F18E}|\u{3030}|\u{2B50}|\u{2B06}|\u{2194}-\u{2199}|\u{21A9}-\u{21AA}|\u{2934}-\u{2935}|\u{25AA}-\u{25AB}|\u{25FE}-\u{25FF}|\u{25B6}|\u{25C0}|\u{25FB}-\u{25FC}|\u{25FD}-\u{25FE}|\u{25B2}|\u{25BC}|\u{25C6}|\u{25C7}|\u{25CB}|\u{25CF}|\u{25A0}|\u{25A1}|\u{25B3}|\u{25B4}|\u{25B5}|\u{25B8}|\u{25B9}|\u{25BA}|\u{25BB}|\u{25BC}|\u{25BD}|\u{25BE}|\u{25BF}|\u{25C2}|\u{25C3}|\u{25C4}|\u{25C5}|\u{25C8}|\u{25C9}|\u{25CA}|\u{25CB}|\u{25CC}|\u{25CD}|\u{25CE}|\u{25CF}|\u{25D0}|\u{25D1}|\u{25D2}|\u{25D3}|\u{25D4}|\u{25D5}|\u{25D6}|\u{25D7}|\u{25D8}|\u{25D9}|\u{25DA}|\u{25DB}|\u{25DC}|\u{25DD}|\u{25DE}|\u{25DF}|\u{25E0}|\u{25E1}|\u{25E2}|\u{25E3}|\u{25E4}|\u{25E5}|\u{25E6}|\u{25E7}|\u{25E8}|\u{25E9}|\u{25EA}|\u{25EB}|\u{25EC}|\u{25ED}|\u{25EE}|\u{25EF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu,
        ),
      );
      if (emojiMatches.length > 0) {
        for (const match of emojiMatches) {
          const emoji = match[0];
          emojiCount++;
          if (emojiSentiment[emoji] !== undefined) {
            emojiScore += emojiSentiment[emoji];
            if (emojiSentiment[emoji] > 0) positiveEmojiCount++;
            if (emojiSentiment[emoji] < 0) negativeEmojiCount++;
          }
        }
      }
      let score = positiveScore * 0.2 - negativeScore * 0.2;
      if (emojiCount > 0) {
        score += (emojiScore / emojiCount) * Math.min(1, emojiCount * 0.5);
      }
      let label: "positive" | "negative" | "neutral" = "neutral";
      let confidence = 0.5;
      if (score > 0.15) {
        label = "positive";
        confidence = Math.min(
          0.99,
          0.6 + Math.abs(score) + positiveEmojiCount * 0.05,
        );
      } else if (score < -0.15) {
        label = "negative";
        confidence = Math.min(
          0.99,
          0.6 + Math.abs(score) + negativeEmojiCount * 0.05,
        );
      }
      const words = text.split(/\s+/).filter((word) => word.length > 3);
      const keywords = words.slice(0, 5);
      const spanishWords = [
        "el",
        "la",
        "que",
        "de",
        "es",
        "y",
        "pero",
        "con",
        "por",
      ];
      const isSpanish = spanishWords.some((word) => lowerText.includes(word));
      const result: TextAnalysis = {
        sentiment: {
          score: Math.max(-1, Math.min(1, score)),
          magnitude: Math.abs(score),
          label,
          confidence,
          emotions: {
            joy: label === "positive" ? confidence : 0,
            sadness: label === "negative" ? confidence * 0.7 : 0,
            anger: label === "negative" ? confidence * 0.8 : 0,
            fear: label === "negative" ? confidence * 0.5 : 0,
            surprise: 0.1,
            disgust: label === "negative" ? confidence * 0.6 : 0,
          },
        },
        keywords,
        entities: [],
        language: isSpanish ? Language.SPANISH : Language.ENGLISH,
      };
      resolve(result);
    });
  }
}
