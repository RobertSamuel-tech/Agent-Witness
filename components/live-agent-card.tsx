"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function LiveAgentCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative mt-12 w-full"
    >
      <Card className="mx-auto w-full max-w-md border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">SalesGPT-1</span>
            <Badge variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive">
              BLOCKED
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Attempted to access credit card database via CRM API
          </p>
          <p className="mt-2 text-xs text-muted-foreground/70">Policy: data_masking triggered • 2s ago</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
