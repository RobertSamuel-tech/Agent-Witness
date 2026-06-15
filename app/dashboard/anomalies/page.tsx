"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Database,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  SearchX,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { InvestigationPanel } from "@/components/investigation-panel";
import { formatRelativeTime, policyResultBadgeClass, truncateMessage } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { PolicyResult } from "@/lib/db/types";

function InvestigateIcon({ policyResult, className }: { policyResult: PolicyResult; className?: string }) {
  if (policyResult === "blocked") return <AlertTriangle className={className} />;
  if (policyResult === "flagged") return <ShieldAlert className={className} />;
  return <Eye className={className} />;
}

const RESULT_LIMIT = 12;
const SKELETON_CARD_COUNT = 3;

interface SearchResult {
  id: string;
  agent_id: string;
  action_type: string;
  input_summary: string;
  output_summary: string;
  policy_result: PolicyResult;
  similarity: number;
  created_at: string;
}

interface QuickChip {
  label: string;
  icon: LucideIcon;
  query: string;
}

const QUICK_CHIPS: QuickChip[] = [
  { label: "Data exports", icon: Download, query: "Agent exported data to an external destination" },
  { label: "PII access", icon: EyeOff, query: "Agent accessed personally identifiable information" },
  { label: "High cost actions", icon: DollarSign, query: "Agent performed an unusually high cost action" },
  { label: "Suspicious domains", icon: Globe, query: "Agent sent data to an unfamiliar or suspicious domain" },
  { label: "Bulk operations", icon: Database, query: "Agent performed a bulk operation across many records" },
];

function similarityFillClass(similarity: number): string {
  if (similarity > 0.85) return "bg-red-500";
  if (similarity > 0.7) return "bg-yellow-500";
  return "bg-blue-500";
}

function similarityPercent(similarity: number): number {
  return Math.round(Math.max(0, Math.min(1, similarity)) * 100);
}

function ResultCard({
  result,
  index,
  onFindSimilar,
  onInvestigate,
}: {
  result: SearchResult;
  index: number;
  onFindSimilar: (inputSummary: string) => void;
  onInvestigate: (id: string) => void;
}) {
  const percent = similarityPercent(result.similarity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer border-slate-800 bg-slate-900 transition-colors hover:border-slate-700"
        onClick={() => onInvestigate(result.id)}
      >
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex w-full max-w-[140px] items-center gap-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full ${similarityFillClass(result.similarity)}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="font-mono text-xs text-slate-400">{percent}% match</span>
            </div>
            <Badge variant="outline" className={policyResultBadgeClass(result.policy_result)}>
              {result.policy_result}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">
              Agent {result.agent_id.slice(0, 8)}
            </span>
            <Badge variant="outline" className="border-slate-700 text-xs text-slate-300">
              {result.action_type}
            </Badge>
          </div>

          <Separator className="bg-slate-800" />

          <p className="mt-2 line-clamp-2 text-sm text-slate-300">{result.input_summary}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">{result.output_summary}</p>

          <div className="mt-3 rounded border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-xs text-slate-400">
              This action has a semantic similarity score of {percent}% relative to your query. Results
              are ranked using pgvector cosine similarity search.
            </p>
            {result.policy_result !== "allowed" ? (
              <p
                className={`mt-1 text-xs ${
                  result.policy_result === "blocked" ? "text-red-400" : "text-yellow-400"
                }`}
              >
                This action was {result.policy_result} by policy enforcement.
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{formatRelativeTime(result.created_at)}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onFindSimilar(result.input_summary);
                }}
                className="text-slate-300 hover:text-slate-50"
              >
                Find Similar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onInvestigate(result.id);
                }}
                className="border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                <InvestigateIcon policyResult={result.policy_result} className="h-3.5 w-3.5" />
                Investigate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AnomaliesPage() {
  const { selectedTenantId } = useTenants();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestedQuery, setSuggestedQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareToKeywords, setCompareToKeywords] = useState(false);
  const [investigateId, setInvestigateId] = useState<string | null>(null);

  async function runSearch(searchQuery: string) {
    if (!selectedTenantId || searchQuery.trim() === "") return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setSuggestedQuery(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": selectedTenantId },
        body: JSON.stringify({ query: searchQuery, limit: RESULT_LIMIT }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { results: SearchResult[]; suggestedQuery?: string };
      setResults(data.results);
      setSuggestedQuery(data.suggestedQuery ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function handleChipClick(chip: QuickChip) {
    setQuery(chip.query);
    void runSearch(chip.query);
  }

  function handleFindSimilar(inputSummary: string) {
    setQuery(inputSummary);
    void runSearch(inputSummary);
  }

  const canSearch = !!selectedTenantId && query.trim() !== "" && !loading;

  return (
    <div className="space-y-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Semantic Anomaly Detection</h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-slate-400">
          Search by intent, not keywords. Powered by Aurora pgvector.
          <Badge
            variant="secondary"
            className="border-blue-800 bg-blue-900/30 text-blue-400"
          >
            HNSW Index
          </Badge>
        </p>
      </div>

      <div className="mx-auto mb-8 max-w-3xl space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Has any agent exported user data to an unauthorized third party?"
            className="min-h-[80px] resize-none border-slate-700 bg-slate-900 text-lg"
          />
          <Button
            size="lg"
            onClick={() => void runSearch(query)}
            disabled={!canSearch}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            Search Intent
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <Button
                key={chip.label}
                variant="outline"
                size="sm"
                onClick={() => handleChipClick(chip)}
                disabled={!selectedTenantId || loading}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Icon className="h-3.5 w-3.5" />
                {chip.label}
              </Button>
            );
          })}
        </div>

        <p className="text-sm text-slate-500">
          Tip: Ask in plain English. pgvector finds semantic similarity, not exact keyword matches.
        </p>
      </div>

      <div>
        {hasSearched ? (
          <div className="mb-4 flex items-center justify-end gap-2">
            <span className="text-sm text-slate-400">Compare to Keywords</span>
            <Switch checked={compareToKeywords} onCheckedChange={setCompareToKeywords} />
          </div>
        ) : null}

        {compareToKeywords && hasSearched ? (
          <Card className="mb-4 border-blue-900/50 bg-blue-950/20">
            <CardContent className="space-y-2 p-4 text-sm text-slate-300">
              <p>
                Keyword search would have missed this because the agent used synonyms like &ldquo;dumped
                records&rdquo; instead of &ldquo;exported data&rdquo;.
              </p>
              <p>pgvector captures intent vectors (1536 dimensions) regardless of vocabulary choice.</p>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-red-900/50 bg-slate-900">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">{truncateMessage(error)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runSearch(query)}
                className="border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
              <motion.div
                key={index}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
              >
                <Skeleton className="h-44 rounded-xl bg-slate-800" />
              </motion.div>
            ))}
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="mt-16 text-center">
            <SearchX className="mx-auto h-16 w-16 text-slate-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-50">No semantic matches found</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-400">
              Try querying for intent like &ldquo;data exfiltration&rdquo;, &ldquo;unauthorized
              access&rdquo;, or &ldquo;bulk export&rdquo; instead of exact keywords.
            </p>
            {suggestedQuery ? <p className="mx-auto mt-4 max-w-md text-sm text-slate-500">{suggestedQuery}</p> : null}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {results.map((result, index) => (
              <ResultCard
                key={result.id}
                result={result}
                index={index}
                onFindSimilar={handleFindSimilar}
                onInvestigate={setInvestigateId}
              />
            ))}
          </div>
        ) : null}
      </div>

      <InvestigationPanel actionId={investigateId} onOpenChange={(open) => !open && setInvestigateId(null)} />
    </div>
  );
}
