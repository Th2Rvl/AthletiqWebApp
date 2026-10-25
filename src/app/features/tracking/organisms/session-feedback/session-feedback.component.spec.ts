import { TestBed } from '@angular/core/testing';
import { SessionFeedback } from '../../../../core/api/models/api.models';
import { SessionFeedbackComponent } from './session-feedback.component';

async function render(feedback: SessionFeedback): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(SessionFeedbackComponent);
  fixture.componentRef.setInput('feedback', feedback);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('SessionFeedbackComponent', () => {
  it('affiche RPE et fatigue sur leur échelle, le commentaire et la validation à l’heure de Paris', async () => {
    const element = await render({
      rpe: 8,
      fatigue: 4,
      comment: 'Genou droit un peu sensible\nsur la dernière série',
      validatedAt: '2026-11-03T17:42:00Z',
      correctedAt: null,
    });

    expect(element.textContent).toContain('8/10');
    expect(element.textContent).toContain('difficile');
    expect(element.textContent).toContain('4/5');
    expect(element.textContent).toContain('élevée');
    expect(element.querySelector('.feedback__comment-text')?.textContent).toBe(
      'Genou droit un peu sensible\nsur la dernière série',
    );
    expect(element.textContent).toContain('Validée le 3 novembre 2026 à 18:42');
    expect(element.textContent).not.toContain('Modifiée le');
  });

  it('signale une correction par « Modifiée le … »', async () => {
    const element = await render({
      rpe: 7,
      fatigue: 3,
      comment: null,
      validatedAt: '2026-11-03T17:42:00Z',
      correctedAt: '2026-11-04T07:05:00Z',
    });

    expect(element.textContent).toContain('Modifiée le 4 novembre 2026 à 08:05');
    expect(element.textContent).toContain('Aucun commentaire');
  });

  it('affiche « Non renseigné » sans ressenti, jamais 0', async () => {
    const element = await render({
      rpe: null,
      fatigue: null,
      comment: null,
      validatedAt: '2026-11-03T17:42:00Z',
      correctedAt: null,
    });

    expect(element.querySelectorAll('.intensity-badge__empty')).toHaveLength(2);
    expect(element.querySelector('.feedback__values')?.textContent).not.toMatch(/\b0\b/);
  });

  it('reste en lecture seule : ni champ ni bouton', async () => {
    const element = await render({
      rpe: 8,
      fatigue: 4,
      comment: 'RAS',
      validatedAt: '2026-11-03T17:42:00Z',
      correctedAt: null,
    });

    expect(element.querySelectorAll('input, textarea, button')).toHaveLength(0);
  });
});
