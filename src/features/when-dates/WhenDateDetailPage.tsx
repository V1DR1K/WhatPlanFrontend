import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { AdaptivePhoto } from '../../components/ui/AdaptivePhoto';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ExperienceGallery } from '../../components/ui/ExperienceGallery';
import { Modal } from '../../components/ui/Modal';
import { session } from '../../lib/api';
import { showNotice } from '../../lib/flash';
import type { ExperiencePhoto, WhenDateComment } from '../../types/domain';
import { deleteWhenDateComment, deleteWhenDatePhoto, getWhenDateOccurrence, saveWhenDateComment, setWhenDateCover, uploadWhenDatePhoto } from './whenDates';

const displayDate = (date: string) => date.split('-').reverse().join('/');

export function WhenDateDetailPage() {
  const specialDateId = Number(useParams().specialDateId); const date = useParams().date ?? ''; const valid = Number.isInteger(specialDateId) && specialDateId > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const qc = useQueryClient(); const [commenting, setCommenting] = useState<WhenDateComment>(); const [deletingPhoto, setDeletingPhoto] = useState<ExperiencePhoto>();
  const detail = useQuery({ queryKey: ['when-date', specialDateId, date], queryFn: () => getWhenDateOccurrence(specialDateId, date), enabled: valid });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['when-date', specialDateId, date] }), qc.invalidateQueries({ queryKey: ['when-dates'] })]);
  const saveComment = useMutation({ mutationFn: (comment: string) => saveWhenDateComment(specialDateId, date, comment), onSuccess: async () => { await refresh(); showNotice('Guardamos tu recuerdo.'); setCommenting(undefined); } });
  const removeComment = useMutation({ mutationFn: () => deleteWhenDateComment(specialDateId, date), onSuccess: async () => { await refresh(); showNotice('Eliminamos tu comentario.'); setCommenting(undefined); } });
  const uploadPhotos = useMutation({ mutationFn: async (files: File[]) => { for (const file of files) await uploadWhenDatePhoto(specialDateId, date, file); }, onSuccess: refresh });
  const cover = useMutation({ mutationFn: (photoId: number) => setWhenDateCover(detail.data!.id!, photoId), onSuccess: refresh });
  const removePhoto = useMutation({ mutationFn: (photoId: number) => deleteWhenDatePhoto(photoId), onSuccess: async () => { await refresh(); setDeletingPhoto(undefined); showNotice('Quitamos la foto.'); } });
  if (!valid || detail.isError || (!detail.isLoading && !detail.data)) return <section className="when-dates-page"><p className="form-error">No pudimos abrir este recuerdo.</p></section>;
  if (detail.isLoading) return <p>Cargando recuerdo…</p>;
  const value = detail.data!; const ownComment = value.comments.find((comment) => comment.author === session.get()?.username); const sourcePhotos = value.entries.flatMap((entry) => entry.sourcePhotos.map((photo) => ({ ...photo, title: entry.title })));
  return <section className="when-date-detail">
    <Link className="when-date-detail__back" to="/when-dates">← Volver a WhenDates</Link>
    <header><p className="eyebrow">FECHA IMPORTANTE</p><h1>{value.specialDate.label}</h1><p>{displayDate(value.occurredOn)} · {value.specialDate.recurrence === 'ONCE' ? 'Única' : value.specialDate.recurrence === 'ANNUAL' ? 'Anual' : 'Mensual'}</p></header>
    <section className="when-date-source-photos"><div className="section-title"><div><p className="eyebrow">RECOPILADO</p><h2>Fotos de las experiencias</h2></div><strong>{sourcePhotos.length}</strong></div>{sourcePhotos.length ? <div className="when-date-source-photos__grid">{sourcePhotos.map((photo) => <div key={photo.id}><AdaptivePhoto alt={`Foto de ${photo.title}`} context="dates" fullSrc={photo.url} thumbnailSrc={photo.thumbnailUrl || photo.url} width={photo.width} height={photo.height} /><span>{photo.title}</span></div>)}</div> : <p className="empty-state">Las experiencias recopiladas todavía no tienen fotos.</p>}</section>
    <ExperienceGallery accentLabel="RECUERDOS AGREGADOS" emptyIcon="💝" name={value.specialDate.label} photos={value.photos} coverPhotoId={value.coverPhoto?.id} onUpload={(files) => uploadPhotos.mutateAsync(files)} onSetCover={(photo) => cover.mutate(photo.id)} onDelete={setDeletingPhoto} />
    <section className="when-date-detail__entries"><div className="section-title"><div><p className="eyebrow">RECOPILADO</p><h2>Lo que hicieron</h2></div><strong>{value.entries.length}</strong></div>{value.entries.length ? <div className="when-date-detail__entry-list">{value.entries.map((entry) => <Link key={entry.id} to={entry.href}><span>{entry.section === 'FOOD' ? '🍽️' : entry.section === 'FILM' ? '🎬' : entry.section === 'COOK' ? '🍳' : '🎲'}</span><div><strong>{entry.title}</strong><small>{entry.detail}</small></div><time>{displayDate(entry.date)}</time></Link>)}</div> : <p className="empty-state">Todavía no hay experiencias registradas para esta fecha.</p>}</section>
    <section className="when-date-detail__comments"><div className="section-title"><div><p className="eyebrow">EXTRAS</p><h2>Sus recuerdos</h2></div><strong>{value.comments.length}/2</strong></div>{value.comments.length ? <div className="when-date-comment-list">{value.comments.map((comment) => <article key={comment.id}><span className="review-avatar">{comment.author[0]?.toUpperCase()}</span><div><h3>Recuerdo de {comment.author}</h3><p>{comment.comment}</p><small>{comment.updatedAt === comment.createdAt ? 'Escrito' : 'Editado'} por {comment.updatedBy}</small></div></article>)}</div> : <p className="empty-state">Escriban qué hizo especial este día.</p>}<div className="experience-review-action"><Button icon={ownComment ? '✏️' : '💬'} variant="secondary" type="button" onClick={() => setCommenting(ownComment)}> {ownComment ? 'Editar mi comentario' : 'Agregar mi comentario'}</Button></div></section>
    {commenting !== undefined && <CommentForm comment={commenting} pending={saveComment.isPending || removeComment.isPending} error={saveComment.error?.message || removeComment.error?.message} onClose={() => setCommenting(undefined)} onSave={(comment) => saveComment.mutate(comment)} onDelete={commenting ? () => removeComment.mutate() : undefined} />}
    {deletingPhoto && <ConfirmDialog title="¿Quitar esta foto?" message="La foto se eliminará definitivamente de este recuerdo." confirmLabel="Quitar foto" pending={removePhoto.isPending} onClose={() => setDeletingPhoto(undefined)} onConfirm={() => removePhoto.mutate(deletingPhoto.id)} />}
  </section>;
}

function CommentForm({ comment, pending, error, onClose, onSave, onDelete }: { comment?: WhenDateComment; pending: boolean; error?: string; onClose: () => void; onSave: (comment: string) => void; onDelete?: () => void }) {
  const [text, setText] = useState(comment?.comment ?? ''); return <Modal onClose={onClose} confirmDiscard pending={pending}><form onSubmit={(event) => { event.preventDefault(); onSave(text.trim()); }}><p className="eyebrow">RECUERDO PERSONAL</p><h2>{comment ? 'Editar comentario' : 'Agregar comentario'}</h2><label>Comentario<textarea className="review-textarea" required value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} placeholder="Contá qué hizo especial este día…" /></label><Button icon="💾" disabled={pending}>{pending ? 'Guardando…' : 'Guardar comentario'}</Button>{onDelete && <Button icon="🗑️" variant="destructive" type="button" disabled={pending} onClick={onDelete}>Borrar comentario</Button>}{error && <p className="form-error">{error}</p>}</form></Modal>;
}
