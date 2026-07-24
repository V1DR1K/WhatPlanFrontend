import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import type { Category, HighlightTag } from '../../types/domain';
import { deleteCategory, getAllCategories, saveCategory } from './categories';
import { deleteHighlightTag, getHighlightTags, saveHighlightTag } from '../places/highlightTags';

type CategoryDraft = Pick<Category, 'name' | 'icon' | 'active'>;

const emptyCategory: CategoryDraft = { name: '', icon: '✨', active: true };
const emptyTag = { name: '', emoji: '✨' };
const slugFor = (name: string) => name.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function CategoryManager() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['categories', 'all'], queryFn: getAllCategories });
  const tags = useQuery({ queryKey: ['highlight-tags'], queryFn: getHighlightTags });
  const [draft, setDraft] = useState<CategoryDraft>(emptyCategory);
  const [tagDraft, setTagDraft] = useState<Omit<HighlightTag, 'id'>>(emptyTag);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category>();
  const [editingTag, setEditingTag] = useState<HighlightTag>();
  const [deletingCategory, setDeletingCategory] = useState<Category>();
  const [deletingTag, setDeletingTag] = useState<HighlightTag>();
  const categoryMutation = useMutation({
    mutationFn: (id?: number) => saveCategory({ ...draft, slug: slugFor(draft.name) }, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'] });
      setDraft(emptyCategory);
      setCreatingCategory(false);
      setEditingCategory(undefined);
    },
  });
  const tagMutation = useMutation({
    mutationFn: (id?: number) => saveHighlightTag(tagDraft, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['highlight-tags'] });
      setTagDraft(emptyTag);
      setCreatingTag(false);
      setEditingTag(undefined);
    },
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'] });
      setDeletingCategory(undefined);
    },
  });
  const deleteTagMutation = useMutation({
    mutationFn: deleteHighlightTag,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['highlight-tags'] });
      setDeletingTag(undefined);
    },
  });
  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setDraft({ name: category.name, icon: category.icon, active: category.active });
  };
  const editTag = (tag: HighlightTag) => {
    setEditingTag(tag);
    setTagDraft({ name: tag.name, emoji: tag.emoji });
  };

  return <section className="settings-page">
    <p className="eyebrow">CONFIGURACIÓN COMPARTIDA</p>
    <h2>Rubros y etiquetas</h2>
    <p className="intro">Avril y Tomas pueden mantener este catálogo. Los rubros definen el tipo de lugar; las etiquetas cuentan por qué vale la pena ir.</p>
    <div className="settings-grid">
      <section>
        <h3>Rubros</h3>
        <Button className="settings-add-button" icon="➕" type="button" onClick={() => { setDraft(emptyCategory); setCreatingCategory(true); }}>Agregar rubro</Button>
        <div className="category-list">
          {list.data?.map(category => <span key={category.id}>
            {category.icon} {category.name}{!category.active && ' (inactiva)'}
            <Button variant="tertiary" icon="✏️" type="button" onClick={() => editCategory(category)}>Editar</Button>
            <Button variant="destructive" icon="🗑️" type="button" onClick={() => { deleteCategoryMutation.reset(); setDeletingCategory(category); }}>Borrar</Button>
          </span>)}
        </div>
      </section>
      <section>
        <h3>Etiquetas destacadas</h3>
        <Button className="settings-add-button" icon="➕" type="button" onClick={() => { setTagDraft(emptyTag); setCreatingTag(true); }}>Agregar etiqueta</Button>
        <div className="category-list">
          {tags.data?.map(tag => <span key={tag.id}>
            {tag.emoji} {tag.name}
            <Button variant="tertiary" icon="✏️" type="button" onClick={() => editTag(tag)}>Editar</Button>
            <Button variant="destructive" icon="🗑️" type="button" onClick={() => { deleteTagMutation.reset(); setDeletingTag(tag); }}>Borrar</Button>
          </span>)}
        </div>
      </section>
    </div>
    {creatingCategory && <Modal onClose={() => setCreatingCategory(false)}>
      <form onSubmit={event => { event.preventDefault(); categoryMutation.mutate(undefined); }}>
        <p className="eyebrow">NUEVO RUBRO</p>
        <h2>Agregar rubro</h2>
        <label>Nombre<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} required autoFocus /></label>
        <label>Ícono<input value={draft.icon} onChange={event => setDraft({ ...draft, icon: event.target.value })} required /></label>
        <Button icon="➕" disabled={categoryMutation.isPending}>{categoryMutation.isPending ? 'Guardando…' : 'Agregar rubro'}</Button>
        {categoryMutation.error && <p className="form-error">{categoryMutation.error.message}</p>}
      </form>
    </Modal>}
    {creatingTag && <Modal onClose={() => setCreatingTag(false)}>
      <form onSubmit={event => { event.preventDefault(); tagMutation.mutate(undefined); }}>
        <p className="eyebrow">NUEVA ETIQUETA</p>
        <h2>Agregar etiqueta</h2>
        <label>Nombre<input value={tagDraft.name} onChange={event => setTagDraft({ ...tagDraft, name: event.target.value })} required autoFocus /></label>
        <label>Ícono<input value={tagDraft.emoji} onChange={event => setTagDraft({ ...tagDraft, emoji: event.target.value })} required /></label>
        <Button icon="➕" disabled={tagMutation.isPending}>{tagMutation.isPending ? 'Guardando…' : 'Agregar etiqueta'}</Button>
        {tagMutation.error && <p className="form-error">{tagMutation.error.message}</p>}
      </form>
    </Modal>}
    {editingCategory && <Modal onClose={() => setEditingCategory(undefined)}>
      <form onSubmit={event => { event.preventDefault(); categoryMutation.mutate(editingCategory.id); }}>
        <p className="eyebrow">EDITAR RUBRO</p>
        <h2>{editingCategory.name}</h2>
        <label>Nombre<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} required autoFocus /></label>
        <label>Ícono<input value={draft.icon} onChange={event => setDraft({ ...draft, icon: event.target.value })} required /></label>
        <Button icon="💾" disabled={categoryMutation.isPending}>{categoryMutation.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
        {categoryMutation.error && <p className="form-error">{categoryMutation.error.message}</p>}
      </form>
    </Modal>}
    {editingTag && <Modal onClose={() => setEditingTag(undefined)}>
      <form onSubmit={event => { event.preventDefault(); tagMutation.mutate(editingTag.id); }}>
        <p className="eyebrow">EDITAR ETIQUETA</p>
        <h2>{editingTag.name}</h2>
        <label>Nombre<input value={tagDraft.name} onChange={event => setTagDraft({ ...tagDraft, name: event.target.value })} required autoFocus /></label>
        <label>Ícono<input value={tagDraft.emoji} onChange={event => setTagDraft({ ...tagDraft, emoji: event.target.value })} required /></label>
        <Button icon="💾" disabled={tagMutation.isPending}>{tagMutation.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
        {tagMutation.error && <p className="form-error">{tagMutation.error.message}</p>}
      </form>
    </Modal>}
    {deletingCategory && <ConfirmDialog
      title="¿Borrar este rubro?"
      message={deleteCategoryMutation.error?.message ?? 'No podrá borrarse si tiene lugares asociados.'}
      confirmLabel="Borrar rubro"
      pending={deleteCategoryMutation.isPending}
      onClose={() => setDeletingCategory(undefined)}
      onConfirm={() => deleteCategoryMutation.mutate(deletingCategory.id)}
    />}
    {deletingTag && <ConfirmDialog
      title="¿Borrar esta etiqueta?"
      message={deleteTagMutation.error?.message ?? 'No podrá borrarse si está asignada a lugares.'}
      confirmLabel="Borrar etiqueta"
      pending={deleteTagMutation.isPending}
      onClose={() => setDeletingTag(undefined)}
      onConfirm={() => deleteTagMutation.mutate(deletingTag.id)}
    />}
  </section>;
}
