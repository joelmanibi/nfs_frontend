'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, ArrowLeft, HelpCircle } from 'lucide-react';

const FAQ_SECTIONS = [
  {
    title: '1. Présentation du service',
    items: [
      {
        q: "Qu'est-ce que le service de transfert sécurisé de fichiers IDS Secure ?",
        a: "Le service de transfert sécurisé de fichiers IDS Secure permet d'échanger des fichiers de manière fiable, traçable et sécurisée entre utilisateurs internes, partenaires et systèmes informatiques. Il remplace les méthodes non sécurisées telles que l'email ou les partages publics.",
      },
      {
        q: 'À qui s\'adresse ce service ?',
        a: "Le service est destiné aux collaborateurs de l'entreprise, aux partenaires externes, aux clients et fournisseurs, ainsi qu'aux applications métiers et systèmes automatisés.",
      },
      {
        q: "Pourquoi utiliser ce service plutôt que l'email ?",
        a: "L'email présente plusieurs limitations : taille limitée des pièces jointes, sécurité insuffisante, absence de traçabilité et risques de fuite de données. La plateforme IDS Secure Transport permet le transfert de fichiers volumineux, le chiffrement des données, la traçabilité des échanges et la conformité réglementaire.",
      },
    ],
  },
  {
    title: '2. Accès et authentification',
    items: [
      {
        q: 'Comment accéder au service ?',
        a: "Le service est accessible via un portail web sécurisé, une API d'intégration, ou des protocoles de transfert sécurisés (SFTP, FTPS, HTTPS).",
      },
      {
        q: 'Comment créer un compte ?',
        a: "Un compte peut être créé via une demande auprès de l'administrateur, par invitation envoyée par un utilisateur autorisé, ou via l'authentification de l'entreprise (SSO / Active Directory).",
      },
      {
        q: "Quels sont les modes d'authentification disponibles ?",
        a: "Les méthodes suivantes peuvent être utilisées : identifiant / mot de passe, authentification multi-facteurs (MFA), authentification via Active Directory ou LDAP, authentification SSO (SAML / OpenID Connect).",
      },
      {
        q: "Que faire si j'ai oublié mon mot de passe ?",
        a: "Vous pouvez utiliser la fonction de réinitialisation du mot de passe sur la page de connexion. Un lien sécurisé vous sera envoyé par email.",
      },
    ],
  },
  {
    title: '3. Envoi et réception de fichiers',
    items: [
      {
        q: 'Quels types de fichiers puis-je envoyer ?',
        a: "La plupart des formats sont acceptés : documents bureautiques (PDF, Word, Excel), images, archives, fichiers techniques, exports de bases de données. Certains types peuvent être bloqués pour des raisons de sécurité.",
      },
      {
        q: 'Quelle est la taille maximale des fichiers ?',
        a: 'La taille maximale est de 1 Go (1 GB) par envoi.',
      },
      {
        q: 'Comment envoyer un fichier ?',
        a: "L'envoi peut être effectué via le portail web, via un client SFTP, via une API, ou via une automatisation système.",
      },
      {
        q: 'Comment le destinataire reçoit-il les fichiers ?',
        a: "Le destinataire reçoit une notification par email ainsi qu'un lien sécurisé de téléchargement. Selon la configuration, il peut être nécessaire de s'authentifier, de saisir un mot de passe ou d'utiliser un code de vérification.",
      },
      {
        q: 'Puis-je envoyer un fichier à un destinataire externe ?',
        a: "Oui. Le service permet l'envoi de fichiers à des destinataires externes via un lien sécurisé avec expiration.",
      },
    ],
  },
  {
    title: '4. Sécurité et confidentialité',
    items: [
      {
        q: 'La transmission des fichiers est-elle sécurisée ?',
        a: 'Oui. Les transferts utilisent des protocoles sécurisés : HTTPS / TLS, SFTP, FTPS. Toutes les communications sont chiffrées.',
      },
      {
        q: 'Les fichiers sont-ils chiffrés ?',
        a: 'Les fichiers sont protégés par chiffrement en transit, chiffrement au repos et chiffrement applicatif.',
      },
      {
        q: 'Les fichiers sont-ils analysés par un antivirus ?',
        a: 'Oui. Les fichiers sont analysés automatiquement afin de détecter virus, malwares ou fichiers suspects.',
      },
      {
        q: 'Les données sont-elles protégées contre les accès non autorisés ?',
        a: "Oui. Le service utilise un contrôle d'accès, une authentification forte, la journalisation des actions et la segmentation des données.",
      },
      {
        q: 'Puis-je protéger un transfert par mot de passe ?',
        a: 'Oui. Un mot de passe peut être demandé au destinataire pour télécharger les fichiers.',
      },
    ],
  },
  {
    title: '5. Gestion des transferts',
    items: [
      {
        q: "Puis-je modifier un transfert après l'envoi ?",
        a: "Dans certains cas, vous pouvez : ajouter des destinataires, renvoyer la notification ou supprimer le transfert.",
      },
      {
        q: 'Puis-je savoir si le fichier a été téléchargé ?',
        a: "Oui. Le système fournit un historique des transferts, un statut de téléchargement et des notifications de réception.",
      },
      {
        q: 'Combien de temps les fichiers sont-ils conservés ?',
        a: 'Les fichiers sont conservés pendant une durée limitée définie par l\'expéditeur au moment de l\'envoi.',
      },
      {
        q: "Puis-je supprimer un fichier avant expiration ?",
        a: "Oui. Les utilisateurs autorisés peuvent supprimer ou bloquer leurs transferts à tout moment depuis la section « Fichiers envoyés ».",
      },
    ],
  },
  {
    title: '6. Notifications',
    items: [
      {
        q: "Le destinataire n'a pas reçu l'email de notification",
        a: "Vérifiez l'adresse email, les spams et les filtres de messagerie. Vous pouvez également renvoyer la notification depuis la plateforme.",
      },
      {
        q: 'Puis-je personnaliser les messages envoyés aux destinataires ?',
        a: "Oui. Un message personnalisé peut être ajouté lors de l'envoi du transfert.",
      },
    ],
  },
  {
    title: '7. Intégration et automatisation',
    items: [
      {
        q: 'Le service peut-il être intégré avec des applications ?',
        a: "Oui. La plateforme propose une API REST, une intégration avec ERP / CRM et l'automatisation des transferts.",
      },
      {
        q: 'Quels protocoles sont supportés ?',
        a: 'Les protocoles couramment supportés sont : SFTP, FTPS, HTTPS, AS2, SCP.',
      },
      {
        q: 'Peut-on automatiser les transferts ?',
        a: "Oui. Les transferts peuvent être automatisés via des scripts, une API ou la planification de tâches.",
      },
    ],
  },
  {
    title: '8. Conformité et audit',
    items: [
      {
        q: 'Les transferts sont-ils tracés ?',
        a: "Oui. Le système enregistre les utilisateurs, les dates, les actions effectuées et les adresses IP.",
      },
      {
        q: 'Le service est-il conforme aux normes de sécurité ?',
        a: "La plateforme peut répondre aux exigences ISO 27001, RGPD, PCI DSS et aux politiques de sécurité internes.",
      },
    ],
  },
  {
    title: '9. Hébergement et infrastructure',
    items: [
      {
        q: 'Où est hébergée la solution ?',
        a: "La solution peut être hébergée dans un datacenter sécurisé, dans un cloud privé ou dans un cloud public.",
      },
      {
        q: 'Le service est-il hautement disponible ?',
        a: "Oui. La plateforme peut être déployée avec haute disponibilité, répartition de charge, sauvegardes et reprise après sinistre.",
      },
    ],
  },
  {
    title: '10. Support',
    items: [
      {
        q: 'Comment contacter le support ?',
        a: "Pour toute assistance : contactez le support informatique, ouvrez un ticket de support ou contactez l'administrateur du service.",
      },
      {
        q: 'Que faire en cas de problème de transfert ?',
        a: "Vérifiez votre connexion internet, la taille du fichier et les restrictions de sécurité. Si le problème persiste, contactez le support.",
      },
    ],
  },
];

// ── Accordéon ─────────────────────────────────────────────────────────────────
function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-NFS-border rounded-xl overflow-hidden transition-all duration-200 ${open ? 'shadow-sm' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left bg-white hover:bg-NFS-100 transition-colors"
      >
        <span className="text-sm font-medium text-NFS-dark leading-snug">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 mt-0.5 text-NFS-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 pt-0 bg-NFS-100 text-sm text-NFS-muted leading-relaxed border-t border-NFS-border">
          {a}
        </div>
      )}
    </div>
  );
}

function FaqSection({ title, items }) {
  return (
    <div>
      <h2 className="text-base font-bold text-NFS-dark mb-3 flex items-center gap-2">
        <span className="inline-block w-1.5 h-5 rounded-full bg-NFS-primary" />
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <AccordionItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FaqPage() {
  return (
    <div className="min-h-screen bg-NFS-bg py-10 px-4">
      {/* Watermark */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.04]" aria-hidden="true">
        <Image src="/logo.png" alt="" width={640} height={640} className="h-auto w-[420px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Retour */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-NFS-muted hover:text-NFS-primary transition-colors mb-8"
        >
          <ArrowLeft size={15} /> Retour à la connexion
        </Link>

        {/* En-tête */}
        <div className="flex items-start gap-4 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-NFS-primary/10 border border-NFS-primary/20 shrink-0">
            <HelpCircle size={24} className="text-NFS-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-NFS-primary uppercase tracking-widest mb-0.5">Port Autonome d&apos;Abidjan</p>
            <h1 className="text-2xl font-bold text-NFS-dark">Foire aux questions</h1>
            <p className="text-sm text-NFS-muted mt-0.5">Service de Transfert Sécurisé de Fichiers — IDS Secure Transport</p>
          </div>
        </div>

        {/* Sections FAQ */}
        <div className="space-y-8">
          {FAQ_SECTIONS.map((section) => (
            <FaqSection key={section.title} title={section.title} items={section.items} />
          ))}
        </div>

        {/* Pied de page */}
        <div className="mt-12 text-center border-t border-NFS-border pt-6 space-y-2">
          <p className="text-xs text-NFS-muted">
            Vous ne trouvez pas la réponse à votre question ?
          </p>
          <p className="text-xs text-NFS-muted">
            Contactez l&apos;administrateur du service ou le support informatique du Port Autonome d&apos;Abidjan.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <Link href="/login" className="text-NFS-primary hover:text-NFS-dark font-medium transition-colors">
              Se connecter
            </Link>
            <span className="text-NFS-border">·</span>
            <Link href="/register" className="text-NFS-primary hover:text-NFS-dark font-medium transition-colors">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

