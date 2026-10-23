import { FormControl } from '@angular/forms';
import { httpUrl } from './validators';

describe('httpUrl', () => {
  it.each(['https://videos.example.fr/squat', ' http://example.fr/v?id=1 '])(
    'accepte « %s »',
    (value) => {
      expect(httpUrl(new FormControl(value))).toBeNull();
    },
  );

  it.each(['pas une adresse', 'ftp://example.fr/video', 'javascript:alert(1)', 'https://'])(
    'refuse « %s »',
    (value) => {
      expect(httpUrl(new FormControl(value))).toEqual({ httpUrl: true });
    },
  );

  it('ne contrôle pas une valeur vide (le champ est facultatif)', () => {
    expect(httpUrl(new FormControl('   '))).toBeNull();
  });
});
