import Joi from 'joi';

export const EVENT_TYPES = [
  'order.created',
  'order.confirmed',
  'order.cancelled',
  'order.shipped',
  'order.delivered',
  'payment.approved',
  'payment.failed',
  'stock.reserved',
  'stock.reservation_failed',
  'auth.verification_requested',
  'auth.password_reset_requested',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: EventType;
  eventVersion: 1;
  occurredAt: string;
  correlationId: string;
  payload: TPayload;
}

export interface OrderItemContract {
  productId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  currency: string;
  totalAmountMinor: number;
  items: OrderItemContract[];
}

export interface PaymentResultPayload {
  orderId: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  reason?: string;
}

export interface AuthActionRequestedPayload {
  userId: string;
  email: string;
  encryptedToken: string;
}

export class EventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventValidationError';
  }
}

const envelopeBase = {
  eventId: Joi.string().uuid().required(),
  eventType: Joi.string()
    .valid(...EVENT_TYPES)
    .required(),
  eventVersion: Joi.number().valid(1).required(),
  occurredAt: Joi.string().isoDate().required(),
  correlationId: Joi.string().min(1).max(128).required(),
  payload: Joi.object().required(),
};

export const eventEnvelopeSchema = Joi.object(envelopeBase).unknown(false);

export const orderCreatedEventSchema = Joi.object({
  ...envelopeBase,
  eventType: Joi.string().valid('order.created').required(),
  payload: Joi.object({
    orderId: Joi.string().uuid().required(),
    customerId: Joi.string().uuid().required(),
    currency: Joi.string().length(3).uppercase().required(),
    totalAmountMinor: Joi.number().integer().min(0).required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          name: Joi.string().min(1).max(250).required(),
          quantity: Joi.number().integer().min(1).required(),
          unitPriceMinor: Joi.number().integer().min(0).required(),
        }).unknown(false),
      )
      .min(1)
      .required(),
  })
    .unknown(false)
    .required(),
}).unknown(false);

export const paymentResultEventSchema = Joi.object({
  ...envelopeBase,
  eventType: Joi.string().valid('payment.approved', 'payment.failed').required(),
  payload: Joi.object({
    orderId: Joi.string().uuid().required(),
    paymentId: Joi.string().uuid().required(),
    amountMinor: Joi.number().integer().min(0).required(),
    currency: Joi.string().length(3).uppercase().required(),
    reason: Joi.string().max(500).optional(),
  })
    .unknown(false)
    .required(),
}).unknown(false);

export const authActionRequestedEventSchema = Joi.object({
  ...envelopeBase,
  eventType: Joi.string()
    .valid('auth.verification_requested', 'auth.password_reset_requested')
    .required(),
  payload: Joi.object({
    userId: Joi.string().uuid().required(),
    email: Joi.string().email().required(),
    encryptedToken: Joi.string().min(40).max(1024).required(),
  })
    .unknown(false)
    .required(),
}).unknown(false);

export function validateEventEnvelope<TPayload = Record<string, unknown>>(
  input: unknown,
): EventEnvelope<TPayload> {
  const candidate = input as { eventType?: unknown } | null;
  const schema =
    candidate?.eventType === 'order.created'
      ? orderCreatedEventSchema
      : candidate?.eventType === 'payment.approved' || candidate?.eventType === 'payment.failed'
        ? paymentResultEventSchema
        : candidate?.eventType === 'auth.verification_requested' ||
            candidate?.eventType === 'auth.password_reset_requested'
          ? authActionRequestedEventSchema
          : eventEnvelopeSchema;
  const { error, value } = schema.validate(input, {
    abortEarly: false,
    convert: false,
  });
  if (error) {
    throw new EventValidationError(error.details.map((detail) => detail.message).join('; '));
  }
  return value as EventEnvelope<TPayload>;
}
