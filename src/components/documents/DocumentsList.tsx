import { Search, Filter, MoreVertical, FileText, FileCheck, FileWarning, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un document..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        <DocumentForm />
      </div>

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
            {documents.map((doc) => {
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
    </div>
  );
}
