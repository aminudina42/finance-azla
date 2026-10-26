"use client";

import React from "react";
import Link from "next/link";
import type { Trip, Vehicle } from "@/lib/types";
import { formatTripDates, calculateTripDays } from "@/lib/wisata-utils";
import TripStatusBadge from "./TripStatusBadge";
import BudgetProgressBar from "./BudgetProgressBar";
import { MapPin, Calendar, Car } from "lucide-react";

interface TripCardProps {
  trip: Trip;
  vehicle?: Vehicle | null;
  actualCost: number;
  estimatedCost: number;
}

export default function TripCard({
  trip,
  vehicle,
  actualCost,
  estimatedCost,
}: TripCardProps) {
  const days = calculateTripDays(trip.start_date, trip.end_date);
  const dateFormatted = formatTripDates(trip.start_date, trip.end_date);

  return (
    <Link
      href={`/wisata/${trip.id}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        className="trip-card"
        style={{
          backgroundColor: "var(--surface, #ffffff)",
          borderRadius: "18px",
          border: "1px solid var(--border, rgba(0,0,0,0.08))",
          padding: "16px 18px",
          boxShadow: "0 3px 12px rgba(0,0,0,0.04)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Top Header: Title & Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text, #1e293b)",
                lineHeight: "1.3",
                margin: 0,
              }}
            >
              {trip.title}
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "var(--text-muted, #64748b)",
                marginTop: "4px",
              }}
            >
              <MapPin size={13} style={{ color: "var(--brand-primary, #287ff0)", flexShrink: 0 }} />
              <span>{trip.destination}</span>
            </div>
          </div>

          <TripStatusBadge status={trip.status} />
        </div>

        {/* Date & Meta Info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            fontSize: "11px",
            color: "var(--text-muted, #64748b)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(100, 116, 139, 0.08)",
            }}
          >
            <Calendar size={12} />
            <span>{dateFormatted}</span>
            <span style={{ fontWeight: 700, color: "var(--text, #1e293b)" }}>({days} Hari)</span>
          </div>

          {vehicle && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
                borderRadius: "6px",
                backgroundColor: "rgba(40, 127, 240, 0.08)",
                color: "var(--brand-primary, #287ff0)",
                fontWeight: 600,
              }}
            >
              <Car size={12} />
              <span>{vehicle.brand} {vehicle.model}</span>
            </div>
          )}
        </div>

        {/* Compact Progress Bar */}
        <div style={{ marginTop: "2px" }}>
          <BudgetProgressBar
            actualCost={actualCost}
            estimatedCost={estimatedCost}
            budgetLimit={trip.total_budget_limit}
            compact
          />
        </div>
      </div>
    </Link>
  );
}
