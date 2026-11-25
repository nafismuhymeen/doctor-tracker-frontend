import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar";
import type { Appointment, Doctor } from "@/types";

const mockDoctorDhaka: Doctor = {
    _id: "doc-dhaka",
    name: "Dr. Gregory House",
    specialization: "Diagnostics",
    hospital: "Dhaka Central",
    phone: "555-0001",
    email: "house@hospital.org",
    timezone: "Asia/Dhaka",
    slotMinutes: 30,
    workingHours: [
        { dayOfWeek: 0, start: "09:00", end: "17:00" },
        { dayOfWeek: 1, start: "09:00", end: "17:00" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const mockAppointments: Appointment[] = [
    {
        _id: "appt-1",
        doctorId: "doc-dhaka",
        patientId: {
            _id: "pat-1",
            name: "John Smith",
            age: 40,
            gender: "male",
            phone: "555-0100",
            condition: "Migraine",
            doctorId: "doc-dhaka",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        startsAt: "2026-11-15T03:00:00.000Z", // 09:00 in Asia/Dhaka (UTC+6)
        endsAt: "2026-11-15T03:30:00.000Z",
        status: "scheduled",
        reason: "Initial consultation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

describe("AppointmentsCalendar Grid & Timezone Rendering", () => {
    it("displays the practitioner's timezone in the header", () => {
        render(
            <AppointmentsCalendar
                appointments={mockAppointments}
                doctor={mockDoctorDhaka}
                view="week"
                selectedDate={new Date(2026, 10, 15)}
                onSelectAppointment={vi.fn()}
            />
        );

        expect(screen.getByText("Asia/Dhaka")).toBeInTheDocument();
        expect(
            screen.getByText(/\(doctor's timezone\)/i)
        ).toBeInTheDocument();
    });

    it("renders week view with Sunday through Saturday headers", () => {
        render(
            <AppointmentsCalendar
                appointments={mockAppointments}
                doctor={mockDoctorDhaka}
                view="week"
                selectedDate={new Date(2026, 10, 15)}
                onSelectAppointment={vi.fn()}
            />
        );

        expect(screen.getByText("Sunday")).toBeInTheDocument();
        expect(screen.getByText("Monday")).toBeInTheDocument();
        expect(screen.getByText("Tuesday")).toBeInTheDocument();
        expect(screen.getByText("Wednesday")).toBeInTheDocument();
        expect(screen.getByText("Thursday")).toBeInTheDocument();
        expect(screen.getByText("Friday")).toBeInTheDocument();
        expect(screen.getByText("Saturday")).toBeInTheDocument();
    });

    it("renders day view with single active day", () => {
        render(
            <AppointmentsCalendar
                appointments={mockAppointments}
                doctor={mockDoctorDhaka}
                view="day"
                selectedDate={new Date(2026, 10, 15)}
                onSelectAppointment={vi.fn()}
            />
        );

        expect(screen.getByText("Sunday")).toBeInTheDocument();
        expect(screen.queryByText("Monday")).not.toBeInTheDocument();
    });

    it("renders scheduled appointment card with patient name and doctor wall-clock time", () => {
        render(
            <AppointmentsCalendar
                appointments={mockAppointments}
                doctor={mockDoctorDhaka}
                view="week"
                selectedDate={new Date(2026, 10, 15)}
                onSelectAppointment={vi.fn()}
            />
        );

        expect(screen.getByText("John Smith")).toBeInTheDocument();
        // 03:00 UTC = 09:00 Asia/Dhaka
        expect(screen.getByText(/09:00 – 09:30/i)).toBeInTheDocument();
    });
});

