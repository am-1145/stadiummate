import { GoogleGenerativeAI } from '@google/generative-ai';
import { STADIUM_NODES, StadiumNode } from '../engine/stadiumData';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Using local deterministic fallback service.");
}


export interface ParsedIntent {
  intent: 'ROUTE' | 'FIND_FACILITY' | 'EMERGENCY' | 'FAQ' | 'CHAT';
  parameters: {
    fromNodeId?: string;
    toNodeId?: string;
    facilityType?: 'washroom' | 'food' | 'medical' | 'transit' | 'quiet';
    accessibilityRequired?: boolean;
    avoidCrowds?: boolean;
    resolvedFromText?: string;
    resolvedToText?: string;
    faqTopic?: string;
    language?: 'English' | 'Spanish' | 'French';
  };
}

// Pre-defined static FAQ data
const OFFICIAL_FAQ: Record<string, Record<string, string>> = {
  English: {
    bag_policy: "Only clear bags smaller than 12x6x12 inches (30x15x30 cm) or small clutches smaller than 4.5x6.5 inches are allowed.",
    ticketing: "All tickets for the FIFA World Cup 2026 are digital. Access them through the official FIFA Tickets app on your mobile device.",
    permitted_items: "Permitted items: Small clear bags, empty plastic water bottles up to 20oz, banners/signs smaller than 3x5 feet. Prohibited: Professional cameras, glass containers, lasers, umbrellas, and weapons.",
    reentry: "Re-entry is strictly prohibited. Once you leave the stadium perimeter gates, your ticket is invalidated.",
    smoking: "MetLife Stadium is a completely smoke-free venue. This includes e-cigarettes and vaping devices."
  },
  Spanish: {
    bag_policy: "Solo se permiten bolsos transparentes de menos de 12x6x12 pulgadas (30x15x30 cm) o carteras pequeñas de menos de 4.5x6.5 pulgadas.",
    ticketing: "Todas las entradas para la Copa Mundial de la FIFA 2026 son digitales. Acceda a ellas a través de la aplicación oficial FIFA Tickets.",
    permitted_items: "Objetos permitidos: Bolsos transparentes pequeños, botellas de agua de plástico vacías de hasta 20 oz, pancartas de menos de 3x5 pies. Prohibido: Cámaras profesionales, envases de vidrio, láseres, paraguas y armas.",
    reentry: "La reentrada está estrictamente prohibida. Una vez que sale del perímetro del estadio, su entrada queda invalidada.",
    smoking: "El Estadio MetLife es un lugar completamente libre de humo. Esto incluye cigarrillos electrónicos y dispositivos de vapeo."
  },
  French: {
    bag_policy: "Seuls les sacs transparents de moins de 12x6x12 pouces (30x15x30 cm) ou les petites pochettes de moins de 4,5x6,5 pouces sont autorisés.",
    ticketing: "Tous les billets pour la Coupe du Monde de la FIFA 2026 sont numériques. Accédez-y via l'application officielle FIFA Tickets.",
    permitted_items: "Objets autorisés: Petits sacs transparents, bouteilles d'eau en plastique vides jusqu'à 20 oz, bannières de moins de 3x5 pieds. Interdit: Appareils photo professionnels, récipients en verre, lasers, parapluies et armes.",
    reentry: "La réentrée est strictement interdite. Une fois que vous quittez le périmètre du stade, votre billet est invalidé.",
    smoking: "Le MetLife Stadium est un établissement entièrement non-fumeur. Cela inclut les e-cigarettes et les vapoteuses."
  }
};

// Official static emergency responses (Strictly rules-based)
const PREDEFINED_EMERGENCY: Record<string, string> = {
  English: "EMERGENCY STATE INITIATED. Please follow the illuminated green exit signs immediately. Do NOT run. Do NOT use elevators. Proceed to the nearest exit gate. Security personnel and medical volunteers are stationed along all corridors.",
  Spanish: "ESTADO DE EMERGENCIA INICIADO. Siga las señales de salida verdes iluminadas inmediatamente. NO corra. NO use los ascensores. Diríjase a la puerta de salida más cercana. El personal de seguridad y los voluntarios médicos están apostados en todos los pasillos.",
  French: "ÉTAT D'URGENCE INITIÉ. Veuillez suivre immédiatement les panneaux de sortie verts illuminés. Ne courez PAS. N'utilisez PAS les ascenseurs. Dirigez-vous vers la porte de sortie la plus proche. Le personnel de sécurité et les bénévoles médicaux sont postés le long de tous les couloirs."
};

export class GeminiService {
  
  /**
   * Use Gemini JSON mode to extract intent & parameters.
   * If Gemini fails or key is missing, defaults to a high-fidelity local regex parser.
   */
  public async classifyIntent(userInput: string): Promise<ParsedIntent> {
    if (!genAI) {
      return this.fallbackClassifyIntent(userInput);
    }

    try {
      const model = genAI.getGenerativeModel({
        model: geminiModel,
        generationConfig: {
          responseMimeType: 'application/json',
        }
      });

      const nodeMappingDescription = STADIUM_NODES.map(n => `ID: ${n.id} (Name: "${n.name}", Type: "${n.type}", Level: ${n.level})`).join('\n');

      const systemPrompt = `
You are the intent parser for StadiumMate, the World Cup 2026 Stadium Companion.
Analyze the user request and map it to a structured JSON object representing the user's intent.

Available nodes in our stadium graph:
${nodeMappingDescription}

Available intents:
1. "ROUTE": The user wants to navigate from a starting seat/node to a destination node (e.g. "Take me from Section 101 to Gate A", "how do I get to VIP Club from my seat 201").
2. "FIND_FACILITY": The user wants to find the nearest facility of a certain type (e.g. "where is the nearest bathroom?", "nearest food", "medical room", "sensory quiet room").
3. "EMERGENCY": The user is reporting an injury, fire, hazard, or needs immediate safety evacuation (e.g. "I am hurt", "SOS", "emergency", "fire", "evacuate").
4. "FAQ": The user is asking about general stadium rules, bags, tickets, tobacco, reentry (e.g. "what is the bag policy?", "can I bring an umbrella?", "can I re-enter?").
5. "CHAT": General greeting, small talk, or unhandled stadium questions (e.g. "hello", "who are you").

Parameters to extract:
- fromNodeId: Map the starting location to one of the active Node IDs. If not fully matching, do NOT guess, but put the raw name in "resolvedFromText" and leave "fromNodeId" blank.
- toNodeId: Map the destination to an active Node ID. If not fully matching, put it in "resolvedToText".
- facilityType: 'washroom' | 'food' | 'medical' | 'transit' | 'quiet'
- accessibilityRequired: Set to true if the user mentions "wheelchair", "step-free", "elevator", "stroller", "accessibility", "cannot use stairs".
- avoidCrowds: Set to true if the user mentions "crowd", "congested", "busy", "quietest route", "avoid traffic".
- faqTopic: Set to one of: 'bag_policy', 'ticketing', 'permitted_items', 'reentry', 'smoking'
- language: Detect if the input is in "English", "Spanish", or "French". Default to "English".

Return ONLY the JSON schema:
{
  "intent": "ROUTE" | "FIND_FACILITY" | "EMERGENCY" | "FAQ" | "CHAT",
  "parameters": {
    "fromNodeId": string or null,
    "toNodeId": string or null,
    "facilityType": "washroom" | "food" | "medical" | "transit" | "quiet" or null,
    "accessibilityRequired": boolean or null,
    "avoidCrowds": boolean or null,
    "resolvedFromText": string or null,
    "resolvedToText": string or null,
    "faqTopic": "bag_policy" | "ticketing" | "permitted_items" | "reentry" | "smoking" or null,
    "language": "English" | "Spanish" | "French"
  }
}
`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userInput }] }],
        systemInstruction: systemPrompt
      });

      const responseText = result.response.text();
      return JSON.parse(responseText.trim()) as ParsedIntent;

    } catch (error) {
      console.error("Gemini classification failed, using fallback:", error);
      return this.fallbackClassifyIntent(userInput);
    }
  }

  /**
   * Convert deterministic facts into localized natural language.
   * If Gemini key is missing or fails, uses static rule templates.
   */
  public async generateResponse(
    intent: string,
    facts: any,
    userInput: string,
    detectedLang: 'English' | 'Spanish' | 'French' = 'English'
  ): Promise<string> {
    
    // Strict guard for emergency: Never let LLM edit emergency guidance
    if (intent === 'EMERGENCY') {
      return PREDEFINED_EMERGENCY[detectedLang] || PREDEFINED_EMERGENCY['English'];
    }

    if (!genAI) {
      return this.fallbackGenerateResponse(intent, facts, detectedLang);
    }

    try {
      const model = genAI.getGenerativeModel({
        model: geminiModel,
      });

      const systemPrompt = `
You are StadiumMate, the official multilingual AI Stadium Companion for the FIFA World Cup 2026.
Your absolute rule is: RULES BEFORE LLM.
You convert verified facts in JSON format into a natural language response.

RULES:
1. You MUST NOT invent, add, or hallucinate any locations, names, routes, distances, queue times, or details.
2. If facts are empty or indicate "not found", state politely that you cannot find that resource and suggest checking with a volunteer or visiting a primary medical center/information desk.
3. Keep the response concise, clear, and action-oriented.
4. Translate and adapt to the requested language: ${detectedLang}.
5. Use markdown formatting for bullet points.

Input Facts:
${JSON.stringify(facts, null, 2)}
`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `User request: ${userInput}` }] }],
        systemInstruction: systemPrompt
      });

      return result.response.text().trim();

    } catch (error) {
      console.error("Gemini NLG failed, using fallback:", error);
      return this.fallbackGenerateResponse(intent, facts, detectedLang);
    }
  }

  // --- FALLBACK DETERMINISTIC IMPLEMENTATIONS ---

  private fallbackClassifyIntent(text: string): ParsedIntent {
    const cleanText = text.toLowerCase();
    
    // Detect Language
    let language: 'English' | 'Spanish' | 'French' = 'English';
    if (cleanText.includes('hola') || cleanText.includes('baño') || cleanText.includes('puerta') || cleanText.includes('ayuda') || cleanText.includes('ruta')) {
      language = 'Spanish';
    } else if (cleanText.includes('bonjour') || cleanText.includes('toilette') || cleanText.includes('porte') || cleanText.includes('aide') || cleanText.includes('secours')) {
      language = 'French';
    }

    // Detect Emergency
    if (cleanText.includes('hurt') || cleanText.includes('injured') || cleanText.includes('emergency') || cleanText.includes('sos') || cleanText.includes('herido') || cleanText.includes('ayuda') || cleanText.includes('blessé') || cleanText.includes('urgence')) {
      return {
        intent: 'EMERGENCY',
        parameters: { language }
      };
    }

    // Detect Accessibility Flags
    const accessibilityRequired = cleanText.includes('wheelchair') || 
                                  cleanText.includes('step-free') || 
                                  cleanText.includes('elevator') || 
                                  cleanText.includes('silla de ruedas') || 
                                  cleanText.includes('ascensor') ||
                                  cleanText.includes('fauteuil') ||
                                  cleanText.includes('ascenseur');

    const avoidCrowds = cleanText.includes('crowd') || 
                        cleanText.includes('congested') || 
                        cleanText.includes('tráfico') || 
                        cleanText.includes('evitar') ||
                        cleanText.includes('monde') ||
                        cleanText.includes('embouteillage');

    // Detect FAQ topics
    if (cleanText.includes('bag') || cleanText.includes('bols') || cleanText.includes('sac')) {
      return { intent: 'FAQ', parameters: { faqTopic: 'bag_policy', language } };
    }
    if (cleanText.includes('ticket') || cleanText.includes('entrada') || cleanText.includes('billet')) {
      return { intent: 'FAQ', parameters: { faqTopic: 'ticketing', language } };
    }
    if (cleanText.includes('bring') || cleanText.includes('permitted') || cleanText.includes('allow') || cleanText.includes('permitido') || cleanText.includes('autoris')) {
      return { intent: 'FAQ', parameters: { faqTopic: 'permitted_items', language } };
    }
    if (cleanText.includes('reentry') || cleanText.includes('re-enter') || cleanText.includes('reentrar') || cleanText.includes('ressortir')) {
      return { intent: 'FAQ', parameters: { faqTopic: 'reentry', language } };
    }
    if (cleanText.includes('smoke') || cleanText.includes('vape') || cleanText.includes('fumar') || cleanText.includes('fumer')) {
      return { intent: 'FAQ', parameters: { faqTopic: 'smoking', language } };
    }

    // Detect Facility Finders
    let facilityType: 'washroom' | 'food' | 'medical' | 'transit' | 'quiet' | undefined;
    if (cleanText.includes('washroom') || cleanText.includes('bathroom') || cleanText.includes('toilet') || cleanText.includes('baño') || cleanText.includes('sanitario') || cleanText.includes('toilette')) {
      facilityType = 'washroom';
    } else if (cleanText.includes('food') || cleanText.includes('eat') || cleanText.includes('concession') || cleanText.includes('comida') || cleanText.includes('hamburguesa') || cleanText.includes('tacos') || cleanText.includes('nourriture') || cleanText.includes('manger')) {
      facilityType = 'food';
    } else if (cleanText.includes('medical') || cleanText.includes('first aid') || cleanText.includes('doctor') || cleanText.includes('médico') || cleanText.includes('enfermería')) {
      facilityType = 'medical';
    } else if (cleanText.includes('quiet') || cleanText.includes('sensory') || cleanText.includes('calma') || cleanText.includes('silencio') || cleanText.includes('tranquille')) {
      facilityType = 'quiet';
    } else if (cleanText.includes('metro') || cleanText.includes('bus') || cleanText.includes('taxi') || cleanText.includes('ride') || cleanText.includes('parking') || cleanText.includes('estacionamiento') || cleanText.includes('gare') || cleanText.includes('transport')) {
      facilityType = 'transit';
    }

    if (facilityType) {
      // Find possible start nodes in query
      const fromNodeId = this.extractNodeIdFromText(cleanText);
      return {
        intent: 'FIND_FACILITY',
        parameters: { facilityType, fromNodeId, accessibilityRequired, avoidCrowds, language }
      };
    }

    // Detect Navigation Route
    const fromNodeId = this.extractNodeIdFromText(cleanText, 'from') || this.extractNodeIdFromText(cleanText);
    const toNodeId = this.extractNodeIdFromText(cleanText, 'to');
    
    if (fromNodeId || toNodeId) {
      return {
        intent: 'ROUTE',
        parameters: { fromNodeId, toNodeId, accessibilityRequired, avoidCrowds, language }
      };
    }

    return {
      intent: 'CHAT',
      parameters: { language }
    };
  }

  private extractNodeIdFromText(text: string, preposition?: 'from' | 'to'): string | undefined {
    // Simple heuristic to extract node references
    const checkString = (id: string, name: string) => {
      const cleanName = name.toLowerCase();
      const cleanId = id.toLowerCase();
      
      if (preposition === 'from') {
        const fromIdx = text.indexOf('from');
        const toIdx = text.indexOf('to');
        if (fromIdx !== -1) {
          const section = text.substring(fromIdx, toIdx !== -1 && toIdx > fromIdx ? toIdx : text.length);
          return section.includes(cleanName) || section.includes(cleanId) || section.includes(cleanId.replace('_', ' '));
        }
      } else if (preposition === 'to') {
        const toIdx = text.indexOf('to');
        if (toIdx !== -1) {
          const section = text.substring(toIdx);
          return section.includes(cleanName) || section.includes(cleanId) || section.includes(cleanId.replace('_', ' '));
        }
      }
      return text.includes(cleanName) || text.includes(cleanId) || text.includes(cleanId.replace('_', ' '));
    };

    for (const node of STADIUM_NODES) {
      if (checkString(node.id, node.name)) return node.id;
      // also check simple abbreviations like "sec 101" -> "SEC_101"
      if (node.type === 'section') {
        const num = node.id.split('_')[1];
        if (text.includes(`sec ${num}`) || text.includes(`section ${num}`) || text.includes(`sección ${num}`)) {
          if (preposition === 'from' && text.includes(`from sec ${num}`)) return node.id;
          if (preposition === 'to' && text.includes(`to sec ${num}`)) return node.id;
          if (!preposition) return node.id;
        }
      }
      if (node.type === 'gate') {
        const letter = node.id.split('_')[1];
        if (text.includes(`gate ${letter.toLowerCase()}`) || text.includes(`puerta ${letter.toLowerCase()}`) || text.includes(`porte ${letter.toLowerCase()}`)) {
          if (preposition === 'from' && text.includes(`from gate ${letter.toLowerCase()}`)) return node.id;
          if (preposition === 'to' && text.includes(`to gate ${letter.toLowerCase()}`)) return node.id;
          if (!preposition) return node.id;
        }
      }
    }

    return undefined;
  }

  private fallbackGenerateResponse(
    intent: string,
    facts: any,
    lang: 'English' | 'Spanish' | 'French'
  ): string {
    if (intent === 'FAQ') {
      const topic = facts.topic;
      const text = OFFICIAL_FAQ[lang]?.[topic] || OFFICIAL_FAQ['English']?.[topic];
      if (text) return text;
      
      return lang === 'Spanish' 
        ? "Lo siento, no tengo esa información de preguntas frecuentes en este momento." 
        : lang === 'French'
        ? "Désolé, je n'ai pas cette information de FAQ pour le moment."
        : "I'm sorry, I don't have that FAQ information at the moment.";
    }

    if (intent === 'ROUTE' || intent === 'FIND_FACILITY') {
      if (!facts.route) {
        return lang === 'Spanish'
          ? "No se pudo encontrar una ruta viable con sus preferencias de accesibilidad."
          : lang === 'French'
          ? "Aucun itinéraire viable n'a pu être trouvé avec vos préférences d'accessibilité."
          : "No viable route could be found matching your accessibility preferences.";
      }
      
      const { path, totalDistance, totalDurationMinutes, directions } = facts.route;
      const startName = path[0].name;
      const endName = path[path.length - 1].name;
      
      if (lang === 'Spanish') {
        let resp = `Aquí está tu ruta desde **${startName}** hasta **${endName}**:\n`;
        resp += `- **Distancia total:** ${totalDistance} metros\n`;
        resp += `- **Tiempo estimado de caminata:** ${totalDurationMinutes} minutos\n\n`;
        resp += `**Instrucciones paso a paso:**\n`;
        directions.forEach((dir: string, i: number) => {
          resp += `${i + 1}. ${dir}\n`;
        });
        return resp;
      } else if (lang === 'French') {
        let resp = `Voici votre itinéraire depuis **${startName}** vers **${endName}**:\n`;
        resp += `- **Distance totale:** ${totalDistance} mètres\n`;
        resp += `- **Durée estimée de marche:** ${totalDurationMinutes} minutes\n\n`;
        resp += `**Instructions détaillées:**\n`;
        directions.forEach((dir: string, i: number) => {
          resp += `${i + 1}. ${dir}\n`;
        });
        return resp;
      } else {
        let resp = `Here is your route from **${startName}** to **${endName}**:\n`;
        resp += `- **Total distance:** ${totalDistance} meters\n`;
        resp += `- **Estimated walking time:** ${totalDurationMinutes} minutes\n\n`;
        resp += `**Step-by-step directions:**\n`;
        directions.forEach((dir: string, i: number) => {
          resp += `${i + 1}. ${dir}\n`;
        });
        return resp;
      }
    }

    // Default Chat Response
    if (lang === 'Spanish') {
      return "¡Hola! Soy StadiumMate, tu compañero digital para el Mundial FIFA 2026. Puedo ayudarte a encontrar la ruta más rápida y accesible a tus asientos, baños, puestos de comida o salidas de emergencia. ¿Cómo te puedo ayudar hoy?";
    } else if (lang === 'French') {
      return "Bonjour! Je suis StadiumMate, votre compagnon de stade pour la Coupe du Monde de la FIFA 2026. Je peux vous aider à trouver l'itinéraire le plus rapide et le plus accessible vers vos sièges, les toilettes, les stands de nourriture ou les sorties de secours. Comment puis-je vous aider aujourd'hui?";
    } else {
      return "Hello! I am StadiumMate, your digital companion for the FIFA World Cup 2026. I can help you find the fastest, most accessible route to your seats, washrooms, concessions, or emergency exits. How can I assist you today?";
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
