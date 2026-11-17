(function () {
  var KLJUC_TEME = 'mozgalica:tema';
  var root = document.documentElement;

  /* 1. Prekidač svetle i tamne teme (usklađen sa aplikacijom) */
  function postaviTemu(tema) {
    root.setAttribute('data-theme', tema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', tema === 'tamna' ? '#10121a' : '#4f46e5');
    }
    var dugme = document.getElementById('tema-prekidac');
    if (dugme) {
      var jeTamna = tema === 'tamna';
      dugme.setAttribute('aria-pressed', String(jeTamna));
      dugme.setAttribute('aria-label', jeTamna ? 'Prebaci na svetlu temu' : 'Prebaci na tamnu temu');
    }
  }

  var temaDugme = document.getElementById('tema-prekidac');
  if (temaDugme) {
    postaviTemu(root.getAttribute('data-theme') === 'tamna' ? 'tamna' : 'svetla');
    temaDugme.addEventListener('click', function () {
      var sledeca = root.getAttribute('data-theme') === 'tamna' ? 'svetla' : 'tamna';
      try {
        localStorage.setItem(KLJUC_TEME, sledeca);
      } catch (e) {}
      postaviTemu(sledeca);
    });
  }

  /* 2. Mobilni meni */
  var meniDugme = document.getElementById('meni-dugme');
  var mobilniMeni = document.getElementById('mobilni-meni');

  function zatvoriMeni() {
    if (!meniDugme || !mobilniMeni) return;
    mobilniMeni.classList.remove('otvoren');
    meniDugme.setAttribute('aria-expanded', 'false');
    meniDugme.setAttribute('aria-label', 'Otvori meni');
  }

  if (meniDugme && mobilniMeni) {
    meniDugme.addEventListener('click', function () {
      var otvoren = mobilniMeni.classList.toggle('otvoren');
      meniDugme.setAttribute('aria-expanded', String(otvoren));
      meniDugme.setAttribute('aria-label', otvoren ? 'Zatvori meni' : 'Otvori meni');
    });

    mobilniMeni.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('click', zatvoriMeni);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') zatvoriMeni();
    });
  }

  /* 3. Univerzalni tabovi (heroj prikaz + gradivo po razredima) */
  function poveziTabove(tabAtribut, panelAtribut) {
    var tabovi = document.querySelectorAll('[' + tabAtribut + ']');
    var paneli = document.querySelectorAll('[' + panelAtribut + ']');
    if (!tabovi.length || !paneli.length) return;

    tabovi.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var cilj = tab.getAttribute(tabAtribut);
        tabovi.forEach(function (t) {
          t.setAttribute('aria-selected', String(t === tab));
        });
        paneli.forEach(function (p) {
          p.hidden = p.getAttribute(panelAtribut) !== cilj;
        });
      });
    });
  }

  poveziTabove('data-prikaz-tab', 'data-prikaz-panel');
  poveziTabove('data-razred-tab', 'data-razred-panel');

  /* 4. Interaktivni mini-kviz na početnoj strani */
  var probaKoren = document.getElementById('probaj-kviz');
  if (probaKoren) {
    var PITANJA = [
      {
        predmet: 'Matematika · 3. razred',
        pitanje: 'U jednoj kutiji ima 8 bojica. Koliko bojica ima u 6 takvih kutija, ako 5 bojica poklonimo?',
        opcije: ['43 bojice', '48 bojica', '53 bojice', '19 bojica'],
        tacan: 0,
        objasnjenje: 'Prvo množimo: 6 × 8 = 48 bojica u svim kutijama. Kada oduzmemo 5 poklonjenih: 48 − 5 = 43 bojice.'
      },
      {
        predmet: 'Srpski jezik · 4. razred',
        pitanje: 'Koja je rečenica napisana potpuno pravopisno ispravno?',
        opcije: [
          'Prošlog leta smo posetili reku dunav i Novi Sad.',
          'Prošlog leta smo posetili reku Dunav i Novi Sad.',
          'Prošlog leta smo posetili reku Dunav i novi Sad.',
          'Prošlog Leta smo posetili reku Dunav i Novi Sad.'
        ],
        tacan: 1,
        objasnjenje: 'Imena reka (Dunav) i svi delovi imena gradova (Novi Sad) pišu se velikim početnim slovom, dok se godišnja doba (leta) pišu malim slovom.'
      },
      {
        predmet: 'Priroda i društvo · 3. razred',
        pitanje: 'Ako stojimo okrenuti licem prema istoku, na kojoj strani sveta su naša leđa?',
        opcije: ['Na severu', 'Na jugu', 'Na zapadu', 'Na severoistoku'],
        tacan: 2,
        objasnjenje: 'Istok i zapad su suprotne glavne strane sveta. Kada gledamo prema istoku, zapad je iza naših leđa, sever je levo, a jug desno.'
      }
    ];

    var aktivno = 0;
    var zvezdice = 0;
    var resena = {};

    var dugmadPredmeta = probaKoren.querySelectorAll('[data-proba-index]');
    var elPitanje = document.getElementById('proba-pitanje');
    var elOpcije = document.getElementById('proba-opcije');
    var elPovratna = document.getElementById('proba-povratna');
    var elZvezdice = document.getElementById('proba-zvezdice');
    var elSledece = document.getElementById('proba-sledece');

    function prikaziPitanje(idx) {
      aktivno = idx;
      var q = PITANJA[idx];
      var izbor = resena[idx];

      dugmadPredmeta.forEach(function (d) {
        d.setAttribute('aria-selected', String(Number(d.getAttribute('data-proba-index')) === idx));
      });

      elPitanje.textContent = q.pitanje;
      elOpcije.innerHTML = '';

      q.opcije.forEach(function (tekst, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'proba-opcija';
        btn.textContent = tekst;

        if (izbor !== undefined) {
          btn.disabled = true;
          if (i === q.tacan) btn.classList.add('proba-opcija--tacna');
          else if (i === izbor) btn.classList.add('proba-opcija--netacna');
        } else {
          btn.addEventListener('click', function () {
            resena[idx] = i;
            if (i === q.tacan) {
              zvezdice += 1;
              elZvezdice.textContent = String(zvezdice);
            }
            prikaziPitanje(idx);
          });
        }
        elOpcije.appendChild(btn);
      });

      if (izbor === undefined) {
        elPovratna.hidden = true;
        elPovratna.textContent = '';
        elSledece.hidden = true;
      } else {
        var pogodak = izbor === q.tacan;
        elPovratna.hidden = false;
        elPovratna.className = 'proba-povratna ' + (pogodak ? 'proba-povratna--uspeh' : 'proba-povratna--savet');
        elPovratna.innerHTML =
          '<strong>' +
          (pogodak ? 'Tačno! +1 zvezdica. ' : 'Skoro! U aplikaciji dete ovde dobija objašnjenje i priliku za sličan zadatak: ') +
          '</strong>' +
          q.objasnjenje;
        elSledece.hidden = false;
        elSledece.textContent = idx < PITANJA.length - 1 ? 'Sledeće pitanje →' : 'Vrati se na prvo pitanje';
      }
    }

    dugmadPredmeta.forEach(function (d) {
      d.addEventListener('click', function () {
        prikaziPitanje(Number(d.getAttribute('data-proba-index')));
      });
    });

    if (elSledece) {
      elSledece.addEventListener('click', function () {
        prikaziPitanje((aktivno + 1) % PITANJA.length);
      });
    }

    prikaziPitanje(0);
  }

  /* 5. Modal „Zatraži pristup“ sa kopiranjem adrese */
  var modal = document.getElementById('pristup-modal');
  if (modal && typeof modal.showModal === 'function') {
    document.querySelectorAll('[data-otvori-pristup]').forEach(function (okidac) {
      okidac.addEventListener('click', function (e) {
        e.preventDefault();
        modal.showModal();
      });
    });

    var zatvori = modal.querySelector('[data-zatvori-modal]');
    if (zatvori) {
      zatvori.addEventListener('click', function () {
        modal.close();
      });
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.close();
    });

    var kopirajBtn = document.getElementById('kopiraj-email');
    if (kopirajBtn) {
      kopirajBtn.addEventListener('click', function () {
        var email = 'kontakt@mozgalica.rs';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).then(function () {
            kopirajBtn.textContent = 'Kopirano!';
            setTimeout(function () {
              kopirajBtn.textContent = 'Kopiraj adresu';
            }, 2200);
          }).catch(function () {});
        }
      });
    }
  }

  /* 6. Aktivna stavka u sadržaju na pravnim stranicama */
  var tocLinkovi = document.querySelectorAll('.pravni-toc a[href^="#"]');
  if (tocLinkovi.length && 'IntersectionObserver' in window) {
    var sekcije = [];
    tocLinkovi.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) sekcije.push({ el: target, link: a });
    });

    if (sekcije.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            tocLinkovi.forEach(function (l) { l.classList.remove('aktivna'); });
            var match = sekcije.find(function (s) { return s.el === entry.target; });
            if (match) match.link.classList.add('aktivna');
          });
        },
        { rootMargin: '-20% 0px -68% 0px' }
      );
      sekcije.forEach(function (s) { observer.observe(s.el); });
    }
  }
})();
