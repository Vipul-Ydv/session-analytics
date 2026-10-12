import mongoose, { type InferSchemaType } from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true },
    type: { type: String, required: true, enum: ["page_view", "click"] },
    page_url: { type: String, required: true },
    timestamp: { type: Date, required: true },
    // Click-only fields: document coordinates plus the sizes needed to place the click on a heatmap.
    x: Number,
    y: Number,
    viewport_w: Number,
    viewport_h: Number,
    page_w: Number,
    page_h: Number,
  },
  { versionKey: false, timestamps: { createdAt: "created_at", updatedAt: false } },
);

// Journey view and the sessions aggregation group/sort by session then time.
eventSchema.index({ session_id: 1, timestamp: 1 });
// Heatmap view fetches clicks for one page.
eventSchema.index({ page_url: 1, type: 1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const EventModel = mongoose.models.Event ?? mongoose.model("Event", eventSchema, "events");
