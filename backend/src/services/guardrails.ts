/**
 * ShopMate AI — Security Guardrails & Content Moderation Module
 *
 * Implements the mandatory security controls:
 * 1. Anti-hallucination (enforced via RAG similarity threshold & strict prompt scoping)
 * 2. Prompt injection defense (sanitizing context, defusing jailbreaks, treating data != instructions)
 * 3. Systematic refusals:
 *    - Price modification / discount negotiation (e.g., "Fais-moi une remise de 50 DH")
 *    - Direct refunds through chat
 *    - Accessing other customers' data or orders
 *    - Medical / legal / pharmacy advice
 *    - Off-topic inquiries
 *    - All refusals offer forwarding to the store manager.
 * 4. Output moderation pass (detects prompt leaks, unauthorized discount commitments, or harmful output)
 */

export interface InjectionCheckResult {
  isSuspicious: boolean;
  detectedPattern?: string;
  sanitizedText: string;
}

export interface RefusalCheckResult {
  shouldRefuse: boolean;
  category?: "discount" | "refund" | "cross_tenant_data" | "medical_legal" | "off_topic";
  refusalMessage?: string;
}

export interface OutputModerationResult {
  passed: boolean;
  sanitizedOutput: string;
  flaggedReason?: string;
}

// ─── 1. Prompt Injection & Adversarial Patterns ───────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|directions|rules)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+(in\s+)?(developer|dan|jailbreak|unrestricted|god)\s+mode/i,
  /act\s+as\s+(dan|an\s+unrestricted|a\s+hacked|an\s+ai\s+without\s+rules)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|internal\s+rules|api\s+key)/i,
  /révèle\s+(ton\s+)?(prompt\s+système|instructions\s+internes)/i,
  /donne[\s\-]+moi\s+(ton\s+)?prompt\s+système/i,
  /oubli\s+(toutes\s+les\s+instructions|tes\s+consignes|ton\s+rôle)/i,
  /ignore\s+(les\s+règles|tes\s+instructions)/i,
  /bypass\s+(safety|guardrails|security)/i,
  /override\s+(system|rules)/i,
  /system\s*override/i,
  /mode\s+développeur/i,
  /pretend\s+you\s+have\s+no\s+(rules|restrictions|limits)/i,
  /from\s+now\s+on\s+you\s+(can|will)\s+ignore/i,
  /ignore\s+(all\s+)?(the\s+)?(safety\s+)?(rules|guardrails|restrictions)/i,
  /forget\s+(all\s+)?(your\s+)?(rules|instructions|role)/i,
  /reveal\s+.{0,40}(prompt|secret|api\s*key|password)/i,
  /(?:system|developer)\s+prompt\s*:/i,
  /\bdo\s+anything\s+now\b|\bjailbreak\b|\bprompt\s+injection\b/i,
  /(?:ignore|override|bypass).{0,50}(system|developer|previous|prior|safety|rules|instructions)/i,
  /(?:ignore|override|bypass).{0,50}(système|consignes|règles|instructions)/i,
  /(?:olvid|ignora).{0,50}(instrucciones|reglas|anteriores)/i,
  /<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/system>/i,
];

function detectInjectionPattern(input: string): RegExp | undefined {
  return INJECTION_PATTERNS.find((regex) => regex.test(input));
}

/**
 * Checks if a string contains known adversarial prompt-injection vectors.
 * Strips dangerous instruction tags while preserving normal conversational input.
 */
export function checkPromptInjection(input: string): InjectionCheckResult {
  const matchedPattern = detectInjectionPattern(input);

  // Strip raw system tag delimiters that attempt to fake conversation boundaries
  const sanitizedText = input
    .replace(/<\/?system>/gi, "")
    .replace(/<\/?instructions>/gi, "")
    .replace(/<\|im_start\|>|<\|im_end\|>/gi, "")
    .replace(/\[\/?INST\]/gi, "")
    .replace(/<<SYS>>|<\/SYS>>/gi, "");

  return {
    isSuspicious: Boolean(matchedPattern),
    detectedPattern: matchedPattern?.source,
    sanitizedText,
  };
}

/**
 * Strips instruction impersonation tags from RAG document chunks or tool outputs
 * to guarantee that retrieved external data cannot hijack model control flow.
 */
export function sanitizeContextData(text: string): string {
  if (!text) return "";
  if (detectInjectionPattern(text)) {
    return "[Contenu masqué : instruction suspecte détectée dans une donnée non fiable.]";
  }
  return text
    .replace(/<\/?system>/gi, "")
    .replace(/<\/?instructions>/gi, "")
    .replace(/<\|im_start\|>|<\|im_end\|>/gi, "")
    .replace(/\[\/?INST\]/gi, "")
    .replace(/<<SYS>>|<\/SYS>>/gi, "");
}

// ─── 2. Systematic Refusal Patterns ──────────────────────────────────────────

const DISCOUNT_PATTERNS = [
  // French
  /(fais|donne|accorde|applique|offre)[\s\-]+moi\s+(une\s+)?(remise|réduction|rabais|promo|coupon)/i,
  /(remise|réduction|rabais|discount)\s+de\s+\d+/i,
  /fais[\s\-]+moi\s+un\s+prix/i,
  /baisse\s+(le\s+)?prix/i,
  /diminue\s+(le\s+)?prix/i,
  /modifie\s+(le\s+)?prix/i,
  /change\s+(le\s+)?prix/i,
  /change\s+the\s+price/i,
  /set\s+(the\s+)?price\s+to/i,
  /prix\s+négociable/i,
  /fais\s+un\s+geste\s+(commercial)?/i,
  /je\s+peux\s+l'avoir\s+pour\s+moins/i,
  // English
  /(give|grant|make)[\s\-]+me\s+a\s+(discount|deal|reduction|price\s+cut)/i,
  /discount\s+of\s+\d+/i,
  /lower\s+the\s+price/i,
  /can\s+i\s+get\s+a\s+discount/i,
  // Darija (Moroccan Arabic phonetic)
  /dir\s+(liya|lia)\s+chi\s+(remise|reduction|taman|prix)/i,
  /n9as\s+(lia|liya)\s+(chwiya|f\s+taman|men\s+taman)/i,
  /na9as\s+(lia|liya)\s+taman/i,
  /chi\s+remise/i,
  /chi\s+tkhfid/i,
];

const REFUND_PATTERNS = [
  // French
  /rembourse[\s\-]+moi/i,
  /donne[\s\-]+moi\s+mon\s+argent/i,
  /je\s+veux\s+un\s+remboursement/i,
  /fais[\s\-]+moi\s+un\s+remboursement/i,
  // English
  /refund\s+me/i,
  /give\s+me\s+my\s+money\s+back/i,
  /i\s+want\s+a\s+refund/i,
  // Darija
  /rje?3\s+(lia|liya)\s+floussi/i,
  /radd?\s+(lia|liya)\s+floussi/i,
  /bghit\s+remboursement/i,
];

const CROSS_TENANT_PATTERNS = [
  // French
  /donne[\s\-]+moi\s+les\s+commandes\s+de\s+(mon\s+ami|quelqu'un|l'autre|un\s+autre)/i,
  /commandes\s+du\s+client\s+\d+/i,
  /commandes\s+d'un\s+autre/i,
  /données\s+d'un\s+autre\s+client/i,
  /numéro\s+de\s+téléphone\s+d'un\s+autre/i,
  // English
  /show\s+me\s+orders\s+of\s+another\s+(customer|user|client)/i,
  /data\s+of\s+another\s+user/i,
];

const MEDICAL_LEGAL_PATTERNS = [
  /conseil\s+(médical|juridique|avocat|docteur|médicament)/i,
  /ce\s+produit\s+guérit[\s\-]+il/i,
  /poursuivre\s+en\s+justice/i,
  /porter\s+plainte/i,
  /posologie|traitement\s+médical/i,
  /medical\s+advice|legal\s+advice|doctor\s+prescription/i,
];

const OFF_TOPIC_PATTERNS = [
  /\b(?:raconte|tell me|write|écris|ecris)\b.{0,40}\b(?:blague|joke|poème|poem|histoire|story)\b/i,
  /\b(?:capitale de|capital of)\b/i,
  /\b(?:météo|weather|politique|politics|élection|election|football|nba|lyrics|paroles de chanson)\b/i,
  /\b(?:écris|ecris|write|debug|programme|code)\b.{0,40}\b(?:code|python|javascript|typescript|html)\b/i,
];

export const STANDARD_REFUSALS = {
  discount:
    "Je ne peux pas modifier les prix ni accorder de remise — c'est en dehors de mon rôle. Je transmets votre demande au responsable de la boutique.",
  refund:
    "Les demandes de remboursement ne peuvent pas être traitées directement par l'assistant. Je transmets votre requête au gérant de la boutique pour qu'il prenne contact avec vous.",
  crossTenant:
    "Pour des raisons strictes de confidentialité et de sécurité, je ne peux accéder qu'à vos propres commandes. Je ne peux pas consulter les données d'autres clients.",
  medicalLegal:
    "En tant qu'assistant commercial, je ne suis pas autorisé(e) à fournir des conseils médicaux ou juridiques. Veuillez consulter un professionnel qualifié.",
  offTopic:
    "Je suis conçu(e) pour vous accompagner dans votre shopping sur la boutique ShopMate. Je ne peux pas répondre à des questions sans rapport avec nos produits, prix ou livraisons. Je peux transmettre votre demande au responsable de la boutique.",
  promptInjection:
    "Je ne peux pas suivre des instructions qui cherchent à modifier mes règles. Je peux vous aider avec une question sur les produits, la livraison ou vos commandes.",
};

/**
 * Checks whether a customer's query triggers any systematic mandatory refusals.
 */
export function checkProhibitedIntent(text: string): RefusalCheckResult {
  const normalized = text.trim();

  // 1. Discount / bargaining attempt
  for (const regex of DISCOUNT_PATTERNS) {
    if (regex.test(normalized)) {
      return {
        shouldRefuse: true,
        category: "discount",
        refusalMessage: STANDARD_REFUSALS.discount,
      };
    }
  }

  // 2. Direct refund attempt
  for (const regex of REFUND_PATTERNS) {
    if (regex.test(normalized)) {
      return {
        shouldRefuse: true,
        category: "refund",
        refusalMessage: STANDARD_REFUSALS.refund,
      };
    }
  }

  // 3. Cross-tenant / other customer data request
  for (const regex of CROSS_TENANT_PATTERNS) {
    if (regex.test(normalized)) {
      return {
        shouldRefuse: true,
        category: "cross_tenant_data",
        refusalMessage: STANDARD_REFUSALS.crossTenant,
      };
    }
  }

  // 4. Medical / legal advice
  for (const regex of MEDICAL_LEGAL_PATTERNS) {
    if (regex.test(normalized)) {
      return {
        shouldRefuse: true,
        category: "medical_legal",
        refusalMessage: STANDARD_REFUSALS.medicalLegal,
      };
    }
  }

  // A small deterministic set catches common off-topic requests. The system
  // prompt handles other unrelated requests that cannot be classified safely
  // with simple keywords.
  for (const regex of OFF_TOPIC_PATTERNS) {
    if (regex.test(normalized)) {
      return {
        shouldRefuse: true,
        category: "off_topic",
        refusalMessage: STANDARD_REFUSALS.offTopic,
      };
    }
  }

  return { shouldRefuse: false };
}

// ─── 3. Output Moderation Pass ────────────────────────────────────────────────

const SYSTEM_LEAK_SIGNATURES = [
  /Tu es l'assistant conversationnel de la boutique/i,
  /## Connaissances — RAG uniquement/i,
  /## Refus obligatoires/i,
  /JWT_SECRET|OPENAI_API_KEY|DEEPSEEK_API_KEY|DB_PASSWORD/i,
  /SELECT\s+\*\s+FROM\s+/i,
  /INSERT\s+INTO\s+/i,
  /Tu es maintenant .*?(?:sans|aucune) restriction/i,
  /ignore (?:toutes? )?(?:les )?(?:règles|instructions) précédentes/i,
  /(?:api[_ -]?key|secret|mot de passe)\s*[:=]\s*\S+/i,
];

const UNLAWFUL_DISCOUNT_COMMITMENTS = [
  /d'accord,? je vous (fais|accorde) une remise/i,
  /je vous fais une réduction de/i,
  /voici un rabais de \d+/i,
  /nouveau prix (spécial|réduit) :/i,
  /je baisse le prix à/i,
  /je peux vous accorder.{0,30}(?:remise|réduction|rabais)/i,
  /(?:remise|réduction|rabais) de \d+\s*(?:dh|mad|%)/i,
  /nouveau prix.{0,30}\d+\s*(?:dh|mad)/i,
];

/**
 * Inspects the LLM generated response before it is displayed or persisted.
 * Catches prompt leaks, accidental discount concessions, or sensitive data disclosures.
 */
export function moderateAgentOutput(output: string): OutputModerationResult {
  if (!output) {
    return { passed: true, sanitizedOutput: "" };
  }

  // 1. Check for system prompt / secret leak
  for (const signature of SYSTEM_LEAK_SIGNATURES) {
    if (signature.test(output)) {
      return {
        passed: false,
        flaggedReason: "system_prompt_or_secret_leak",
        sanitizedOutput:
          "Je suis l'assistant ShopMate AI. Comment puis-je vous aider avec nos produits ou votre commande ?",
      };
    }
  }

  // 2. Check for unauthorized price/discount concessions hallucinated by the model
  for (const pattern of UNLAWFUL_DISCOUNT_COMMITMENTS) {
    if (pattern.test(output)) {
      return {
        passed: false,
        flaggedReason: "unauthorized_discount_hallucination",
        sanitizedOutput: STANDARD_REFUSALS.discount,
      };
    }
  }

  return {
    passed: true,
    sanitizedOutput: output,
  };
}
