'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import {
  createCategory,
  deleteCategory,
  listCategories,
  moveCategory,
  updateCategory,
} from '@/lib/api/catalog';
import type { ProductCategoryOutput } from '@/lib/api/types';

const ROOT_VALUE = '__root__';

interface CategoryNode extends ProductCategoryOutput {
  children: CategoryNode[];
}

function buildTree(categories: ProductCategoryOutput[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  for (const category of categories) {
    nodes.set(category.id, { ...category, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentCategoryId && nodes.has(node.parentCategoryId)) {
      nodes.get(node.parentCategoryId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByRank = (a: CategoryNode, b: CategoryNode) => a.rank - b.rank;
  const sortTree = (list: CategoryNode[]) => {
    list.sort(sortByRank);
    for (const item of list) {
      sortTree(item.children);
    }
  };
  sortTree(roots);

  return roots;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategoryOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductCategoryOutput | 'new' | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setCategories(await listCategories());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const tree = useMemo(() => buildTree(categories), [categories]);

  function siblingsOf(category: ProductCategoryOutput): ProductCategoryOutput[] {
    return categories
      .filter((candidate) => candidate.parentCategoryId === category.parentCategoryId)
      .sort((a, b) => a.rank - b.rank);
  }

  async function handleSwap(category: ProductCategoryOutput, direction: 'up' | 'down'): Promise<void> {
    const siblings = siblingsOf(category);
    const index = siblings.findIndex((item) => item.id === category.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }
    const target = siblings[targetIndex];
    if (!target) {
      return;
    }
    try {
      await moveCategory(category.id, category.parentCategoryId, target.rank);
      await moveCategory(target.id, target.parentCategoryId, category.rank);
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo reordenar la categoría');
    }
  }

  async function handleDelete(category: ProductCategoryOutput): Promise<void> {
    if (!window.confirm(`¿Eliminar la categoría "${category.name}"? Sus subcategorías subirán un nivel.`)) {
      return;
    }
    try {
      await deleteCategory(category.id);
      toast.success('Categoría eliminada');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar la categoría');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Árbol jerárquico de categorías del catálogo. Usa las flechas para reordenar entre hermanas y el campo
            &quot;Categoría padre&quot; del diálogo para mover de lugar.
          </p>
        </div>
        <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
          <DialogTrigger asChild>
            <Button>Nueva categoría</Button>
          </DialogTrigger>
          {editing === 'new' && (
            <CategoryDialog
              category={null}
              categories={categories}
              onSuccess={() => {
                setEditing(null);
                void reload();
              }}
            />
          )}
        </Dialog>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        {tree.length === 0 && !loading && (
          <p className="p-6 text-center text-sm text-muted-foreground">No hay categorías.</p>
        )}
        {tree.length > 0 && (
          <ul className="divide-y divide-border">
            {tree.map((node) => (
              <CategoryRow
                key={node.id}
                node={node}
                depth={0}
                categories={categories}
                editing={editing}
                setEditing={setEditing}
                onSwap={handleSwap}
                onDelete={handleDelete}
                onSuccess={() => {
                  setEditing(null);
                  void reload();
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  node,
  depth,
  categories,
  editing,
  setEditing,
  onSwap,
  onDelete,
  onSuccess,
}: {
  node: CategoryNode;
  depth: number;
  categories: ProductCategoryOutput[];
  editing: ProductCategoryOutput | 'new' | null;
  setEditing: (value: ProductCategoryOutput | 'new' | null) => void;
  onSwap: (category: ProductCategoryOutput, direction: 'up' | 'down') => Promise<void>;
  onDelete: (category: ProductCategoryOutput) => Promise<void>;
  onSuccess: () => void;
}) {
  return (
    <li>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          <div className="flex flex-col">
            <Button variant="ghost" size="icon" className="h-4 w-6" onClick={() => void onSwap(node, 'up')}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-4 w-6" onClick={() => void onSwap(node, 'down')}>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{node.name}</span>
              {!node.isActive && <Badge variant="muted">Inactiva</Badge>}
              {node.isInternal && <Badge variant="outline">Interna</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">/{node.handle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={editing === node} onOpenChange={(open) => setEditing(open ? node : null)}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Editar
              </Button>
            </DialogTrigger>
            {editing === node && <CategoryDialog category={node} categories={categories} onSuccess={onSuccess} />}
          </Dialog>
          <Button size="sm" variant="outline" onClick={() => void onDelete(node)}>
            Eliminar
          </Button>
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              categories={categories}
              editing={editing}
              setEditing={setEditing}
              onSwap={onSwap}
              onDelete={onDelete}
              onSuccess={onSuccess}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function CategoryDialog({
  category,
  categories,
  onSuccess,
}: {
  category: ProductCategoryOutput | null;
  categories: ProductCategoryOutput[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [handle, setHandle] = useState(category?.handle ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [parentCategoryId, setParentCategoryId] = useState(category?.parentCategoryId ?? ROOT_VALUE);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [isInternal, setIsInternal] = useState(category?.isInternal ?? false);
  const [metaTitle, setMetaTitle] = useState(category?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(category?.metaDescription ?? '');
  const [submitting, setSubmitting] = useState(false);

  const parentOptions = categories.filter((candidate) => {
    if (!category) {
      return true;
    }
    if (candidate.id === category.id) {
      return false;
    }
    return !candidate.mpath.startsWith(`${category.mpath}${category.id}.`);
  });

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      const newParentId = parentCategoryId === ROOT_VALUE ? null : parentCategoryId;
      if (category) {
        await updateCategory(category.id, {
          name,
          handle: handle || undefined,
          description: description || undefined,
          isActive,
          isInternal,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        });
        if (newParentId !== category.parentCategoryId) {
          await moveCategory(category.id, newParentId, 0);
        }
      } else {
        await createCategory({
          name,
          handle: handle || undefined,
          description: description || undefined,
          parentCategoryId: newParentId ?? undefined,
          isActive,
          isInternal,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        });
      }
      toast.success('Categoría guardada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la categoría');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{category ? `Editar ${category.name}` : 'Nueva categoría'}</DialogTitle>
      </DialogHeader>
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-name">Nombre</Label>
          <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-handle">Slug (opcional, se genera del nombre)</Label>
          <Input id="category-handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-description">Descripción</Label>
          <Textarea
            id="category-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Categoría padre</Label>
          <Select value={parentCategoryId} onValueChange={setParentCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Raíz (sin padre)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROOT_VALUE}>Raíz (sin padre)</SelectItem>
              {parentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="category-active" checked={isActive} onCheckedChange={(value) => setIsActive(value === true)} />
          <Label htmlFor="category-active">Activa</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="category-internal"
            checked={isInternal}
            onCheckedChange={(value) => setIsInternal(value === true)}
          />
          <Label htmlFor="category-internal">Interna (no visible en la tienda)</Label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-meta-title">Meta título (SEO)</Label>
          <Input id="category-meta-title" value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-meta-description">Meta descripción (SEO)</Label>
          <Textarea
            id="category-meta-description"
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
