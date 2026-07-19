import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

// Rate limiter for general API routes (30 requests per min)
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'Too many requests from this client. Please try again after 1 minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Zod schemas for validation
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  fromNodeId: z.string().optional(),
  accessibilityRequired: z.boolean().optional(),
  avoidCrowds: z.boolean().optional()
});

export const RouteRequestSchema = z.object({
  from: z.string().min(1).max(50),
  to: z.string().min(1).max(50),
  accessibilityRequired: z.boolean().optional(),
  avoidCrowds: z.boolean().optional()
});

export const IncidentReportSchema = z.object({
  type: z.enum(['medical', 'cleaning', 'queue', 'lost_found', 'navigation', 'language_assist']),
  nodeId: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  severity: z.enum(['low', 'medium', 'high', 'critical'])
});

export const IncidentUpdateSchema = z.object({
  status: z.enum(['pending', 'assigned', 'resolved']),
  volunteerName: z.string().optional()
});

export const AdminOverrideSchema = z.object({
  nodeId: z.string().min(1).max(50),
  density: z.enum(['Low', 'Medium', 'High', 'Very High'])
});

// Input Validation Middleware
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: err.errors });
      } else {
        res.status(500).json({ error: 'Internal validation error' });
      }
    }
  };
};

// Prompt Injection Detection Middleware
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /forget\s+(all\s+)?(previous\s+)?instructions/i,
  /system\s+override/i,
  /you\s+are\s+now\s+an\s+unrestricted/i,
  /dan\s+mode/i,
  /jailbreak/i,
  /forget\s+rules/i,
  /tell\s+me\s+the\s+prompt/i,
  /reveal\s+your\s+system/i,
  /say\s+the\s+nearest\s+exit\s+is/i // Specific check for hallucinating routes
];

export const detectPromptInjection = (req: Request, res: Response, next: NextFunction) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return next();
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      console.warn(`SECURITY WARNING: Blocked suspected prompt injection attack: "${message}"`);
      return res.status(400).json({
        error: 'Security Policy Violation',
        message: 'Your request contains forbidden override sequences. Please rephrase your stadium query.'
      });
    }
  }

  next();
};

// XSS Output Sanitization Utility
export function sanitizeString(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitizedObj as T;
  }
  return obj;
}
