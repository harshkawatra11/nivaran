"use client";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import { hashCenter, type ClusterRow } from "@/lib/board-types";
import "leaflet/dist/leaflet.css";
export default function WardMap({ clusters }: { clusters: ClusterRow[] }) {
  return (
    <MapContainer
      center={[28.61, 77.21]}
      zoom={10}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {clusters.map((c) => (
        <CircleMarker
          key={c.id}
          center={hashCenter(c.geohash6)}
          radius={Math.min(26, 7 + Math.sqrt(c.case_count) * 3)}
          pathOptions={{
            color: c.status === "systemic" ? "#a3242b" : "#956118",
            fillOpacity: 0.3,
          }}
        >
          <Popup>
            <strong>{c.locality ?? "Delhi locality"}</strong>
            <p>
              {c.case_count} reports · {c.overdue_count} overdue
            </p>
            <Link href={`/cluster/${c.id}`}>View cluster →</Link>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
