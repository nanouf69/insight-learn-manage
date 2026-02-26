import { useState, useMemo } from "react";
import { Search, Filter, MoreVertical, FileText, FileCheck, FileWarning, Download, Eye, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentForm } from "./DocumentForm";
import { EmailTemplatesEditor } from "./EmailTemplatesEditor";

const documents = [
  {
    id: 1,
    name: "Convention de formation - TechCorp",
    type: "Convention",
    formation: "React Avancé",
    date: "28 Jan 2026",
    status: "signed",
    size: "245 Ko",
  },
  {
    id: 2,
    name: "Programme pédagogique - UX Design",
    type: "Programme",
    formation: "UX Design",
    date: "25 Jan 2026",
    status: "draft",
    size: "1.2 Mo",
  },
  {
    id: 3,
    name: "Feuille d'émargement - Session 12",
    type: "Émargement",
    formation: "Python Data Science",
    date: "22 Jan 2026",
    status: "signed",
    size: "89 Ko",
  },
  {
    id: 4,
    name: "Attestation de fin de formation",
    type: "Attestation",
    formation: "Management d'équipe",
    date: "20 Jan 2026",
    status: "pending",
    size: "156 Ko",
  },
  {
    id: 5,
    name: "Facture #2026-0045",
    type: "Facture",
    formation: "React Avancé",
    date: "18 Jan 2026",
    status: "signed",
    size: "78 Ko",
  },
];

const statusConfig = {
  draft: { label: "Brouillon", icon: FileText, class: "text-muted-foreground" },
  pending: { label: "En attente", icon: FileWarning, class: "text-warning" },
  signed: { label: "Signé", icon: FileCheck, class: "text-success" },
};

export function DocumentsList() {
  const [activeTab, setActiveTab] = useState("documents");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterFormation, setFilterFormation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const types = useMemo(() => [...new Set(documents.map(d => d.type))], []);
  const formations = useMemo(() => [...new Set(documents.map(d => d.formation))], []);

  const filtered = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = !search || doc.name.toLowerCase().includes(search.toLowerCase()) || doc.type.toLowerCase().includes(search.toLowerCase()) || doc.formation.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || doc.type === filterType;
      const matchFormation = filterFormation === "all" || doc.formation === filterFormation;
      const matchStatus = filterStatus === "all" || doc.status === filterStatus;
      return matchSearch && matchType && matchFormation && matchStatus;
    });
  }, [search, filterType, filterFormation, filterStatus]);

  const hasActiveFilters = filterType !== "all" || filterFormation !== "all" || filterStatus !== "all";

  const clearFilters = () => {
    setFilterType("all");
    setFilterFormation("all");
    setFilterStatus("all");
    setSearch("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="mails-type" className="gap-2">
            <Mail className="h-4 w-4" />
            Mails Type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6 mt-4">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un document..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="w-4 h-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </Button>
            </div>
            <DocumentForm />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/50 rounded-lg border border-border">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {types.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterFormation} onValueChange={setFilterFormation}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Formation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les formations</SelectItem>
                  {formations.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="signed">Signé</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                  <X className="w-3 h-3" /> Réinitialiser
                </Button>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <p className="text-sm text-muted-foreground">Total documents</p>
              <p className="text-2xl font-bold mt-1">247</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-muted-foreground">En attente de signature</p>
              <p className="text-2xl font-bold mt-1 text-warning">12</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-muted-foreground">Signés ce mois</p>
              <p className="text-2xl font-bold mt-1 text-success">34</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-muted-foreground">Stockage utilisé</p>
              <p className="text-2xl font-bold mt-1">2.4 Go</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Document</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Formation</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Taille</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun document ne correspond aux filtres sélectionnés.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filtered.map((doc) => {
                  const StatusIcon = statusConfig[doc.status as keyof typeof statusConfig].icon;
                  return (
                    <TableRow key={doc.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="badge-primary">{doc.type}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{doc.formation}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.date}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${statusConfig[doc.status as keyof typeof statusConfig].class}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {statusConfig[doc.status as keyof typeof statusConfig].label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{doc.size}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <Eye className="w-4 h-4" /> Aperçu
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Download className="w-4 h-4" /> Télécharger
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="mails-type" className="mt-4">
          <EmailTemplatesEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
