"use client";

import { useEffect, useRef, useState } from "react";
import { AgentsSection } from "@/components/AgentsSection";
import { DetailHeader } from "@/components/DetailHeader";
import { IssueMap } from "@/components/IssueMap";
import { MetaStrip } from "@/components/MetaStrip";
import { OrchestratorDecisions } from "@/components/OrchestratorDecisions";
import { Problem } from "@/components/Problem";
import { StatusBanner } from "@/components/StatusBanner";
import { Twist } from "@/components/Twist";
import { caseContext } from "@/lib/case";
import {
  startReceiverSession,
  startSenderSession,
  type ActiveConversation,
} from "@/lib/elevenlabs";
import { derive, type Status } from "@/lib/status";

function newOrderId() {
  let digits = "";
  for (let i = 0; i < 11; i++) digits += Math.floor(Math.random() * 10);
  return `OD${digits}`;
}

// Visually-stable placeholder for SSR so hydration is clean.
const ORDER_ID_PLACEHOLDER = "OD———————————";

export default function DashboardPage() {
  const [status, setStatus] = useState<Status>("NEW");
  const [orderId, setOrderId] = useState<string>(ORDER_ID_PLACEHOLDER);
  const activeConversation = useRef<ActiveConversation | null>(null);
  const forcedCallback = useRef(false);

  useEffect(() => {
    setOrderId(newOrderId());
  }, []);

  const handleCallSender = async () => {
    forcedCallback.current = false;
    setStatus("AGENT1_IN_CALL");
    try {
      const conversation = await startSenderSession(caseContext, () => {
        const wasForced = forcedCallback.current;
        activeConversation.current = null;
        if (wasForced) {
          forcedCallback.current = false;
          return;
        }
        setStatus("AGENT1_DONE");
      });
      if (forcedCallback.current) {
        try {
          await conversation.endSession();
        } catch (err) {
          console.error("Failed to end pre-empted session", err);
        }
        return;
      }
      activeConversation.current = conversation;
    } catch (err) {
      console.error("Failed to start sender session", err);
      activeConversation.current = null;
      if (!forcedCallback.current) {
        setStatus("NEW");
      }
    }
  };

  const handleCallRecipient = async () => {
    forcedCallback.current = false;
    setStatus("AGENT2_IN_CALL");
    try {
      const conversation = await startReceiverSession(caseContext, () => {
        const wasForced = forcedCallback.current;
        activeConversation.current = null;
        if (wasForced) {
          forcedCallback.current = false;
          return;
        }
        setStatus("RESOLVED");
      });
      if (forcedCallback.current) {
        try {
          await conversation.endSession();
        } catch (err) {
          console.error("Failed to end pre-empted session", err);
        }
        return;
      }
      activeConversation.current = conversation;
    } catch (err) {
      console.error("Failed to start receiver session", err);
      activeConversation.current = null;
      if (!forcedCallback.current) {
        setStatus("AGENT1_DONE");
      }
    }
  };

  const handleEndCall = async () => {
    const conv = activeConversation.current;
    if (conv) {
      activeConversation.current = null;
      try {
        await conv.endSession();
      } catch (err) {
        console.error("Failed to end call", err);
      }
    }
  };

  const handleEscalate = async () => {
    forcedCallback.current = true;
    const conv = activeConversation.current;
    activeConversation.current = null;
    if (conv) {
      try {
        await conv.endSession();
      } catch (err) {
        console.error("Failed to end session on Escalate", err);
      }
    }
    setStatus("CALLBACK_SCHEDULED");
  };

  const handleReset = () => {
    const conv = activeConversation.current;
    activeConversation.current = null;
    forcedCallback.current = false;
    if (conv) {
      conv.endSession().catch((err) => {
        console.error("Failed to end session on Reset", err);
      });
    }
    setOrderId(newOrderId());
    setStatus("NEW");
  };

  const derived = derive(status);

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-8 lg:py-10">
      <section className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <DetailHeader
          orderId={orderId}
          derived={derived}
          onCallSender={handleCallSender}
          onCallRecipient={handleCallRecipient}
          onEndCall={handleEndCall}
          onEscalate={handleEscalate}
          onReset={handleReset}
        />
        <StatusBanner derived={derived} />
        <MetaStrip />
        <div className="grid grid-cols-2">
          <div className="relative min-h-[280px] border-r border-[var(--line)]">
            <div className="absolute inset-0">
              <IssueMap />
              <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[var(--line-2)] bg-[var(--surface)] px-[10px] py-[3px] font-mono text-[10.5px] text-[var(--ink)] shadow-[var(--shadow-sm)]">
                ~2 km gap
              </div>
              <div className="absolute bottom-[14px] left-[14px] flex flex-col gap-[5px] rounded-[9px] border border-[var(--line-2)] bg-[oklch(0.99_0.003_255_/_0.92)] px-[10px] py-[8px] shadow-[var(--shadow-sm)] backdrop-blur-[5px]">
                <Leg color="bg-[var(--green)]" label="Typed address" />
                <Leg color="bg-[var(--red)]" label="Dropped pin" />
                <Leg
                  color="bg-[var(--ink-2)] rounded-[2px]"
                  label="Fulfilling store"
                />
              </div>
            </div>
          </div>
          <div className="p-[18px_22px]">
            <Problem />
            <Twist option1Chosen={derived.option1Chosen} />
          </div>
        </div>
        <OrchestratorDecisions />
        <AgentsSection derived={derived} />
      </section>
    </main>
  );
}

function Leg({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-[7px] text-[11px] text-[var(--muted)]">
      <span className={`h-[9px] w-[9px] rounded-full ${color}`} />
      <strong className="font-semibold text-[var(--ink)]">{label}</strong>
    </div>
  );
}
