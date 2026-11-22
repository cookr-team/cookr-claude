
import { User, UserRole, UserStatus, Booking, BookingStatus, MenuItem, ChefRecipe } from '../types';

const UUID_ADMIN = '00000000-0000-0000-0000-000000000001';
const UUID_CLIENT = '11111111-1111-1111-1111-111111111111';
const UUID_TESTE5 = '77777777-5555-5555-5555-555555555555';
const UUID_CHEF_MARIA = '22222222-2222-2222-2222-222222222222';
const UUID_CHEF_RICARDO = '33333333-3333-3333-3333-333333333333';
export const UUID_MENU_1 = '44444444-4444-4444-4444-444444444441';
export const UUID_MENU_2 = '44444444-4444-4444-4444-444444444442';
export const UUID_RECIPE_1 = '55555555-5555-5555-5555-555555555551';
export const UUID_BOOKING_1 = '66666666-6666-6666-6666-666666666661';
export const UUID_ADDRESS_1 = '77777777-7777-7777-7777-777777777771';

export const mockUsers: User[] = [
  { 
    id: UUID_ADMIN, 
    nome: 'Admin Cookr', 
    email: 'cookr.team@gmail.com', 
    telefone: '912345678', 
    role: UserRole.ADMIN, 
    status: UserStatus.ACTIVE, 
    created_at: '2024-01-01',
    // Fix: Using is_chef instead of isChef to match User interface
    is_chef: false,
    isAvailable: false
  },
  { 
    id: UUID_CLIENT, 
    nome: 'João Silva', 
    email: 'joao@email.com', 
    telefone: '921122334', 
    role: UserRole.CLIENT, 
    status: UserStatus.ACTIVE, 
    created_at: '2024-02-15',
    // Fix: Using is_chef instead of isChef to match User interface
    is_chef: false,
    isAvailable: false,
    addresses: [
      { id: UUID_ADDRESS_1, label: 'Casa', address: 'Rua de Santa Catarina, 450, Porto', city: 'Porto', isDefault: true }
    ],
    kitchenNotes: 'Cozinha em open-space com placa de indução.',
    favoriteChefIds: [UUID_CHEF_MARIA]
  },
  { 
    id: UUID_TESTE5, 
    nome: 'Utilizador Teste 5', 
    email: 'teste5@gmail.com', 
    telefone: '910000005', 
    role: UserRole.CLIENT, 
    status: UserStatus.ACTIVE, 
    created_at: '2024-05-01',
    is_chef: false,
    isAvailable: true,
    addresses: [
      { id: 'addr-teste-5', label: 'Casa', address: 'Avenida da Liberdade, 100, Lisboa', city: 'Lisboa', isDefault: true }
    ],
    kitchenNotes: 'Cozinha totalmente equipada.',
    cuisine_preferences: ['Mediterrânica', 'Portuguesa', 'Italiana'],
    dietary_restrictions: [],
    loyalty_points: 100,
    approvedByAdmin: true
  },
  { 
    id: UUID_CHEF_MARIA, 
    nome: 'Chef Maria Garcia', 
    email: 'maria@chef.com', 
    telefone: '931122334', 
    role: UserRole.COOK, 
    status: UserStatus.ACTIVE, 
    created_at: '2024-02-10',
    avatar_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=200',
    // Fix: Using is_chef instead of isChef to match User interface
    is_chef: true,
    isAvailable: true,
    nif: '123456789',
    biografia: 'Chef apaixonada pela cozinha mediterrânica com 10 anos de experiência em restaurantes Michelin.',
    especialidades: ['Mediterrânica', 'Marisco', 'Tapas'],
    precoMedio: 45,
    localizacao: 'Lisboa',
    rating: 4.8,
    total_reservas: 12,
    approvedByAdmin: true,
    certifications_and_awards: [
      {
        id: 'cert-1',
        title: 'Diplôme de Cuisine & Haute Gastronomie',
        issuer: 'Le Cordon Bleu Lisboa',
        year: '2021',
        type: 'certification',
        description: 'Especialização avançada em artes culinárias e técnicas clássicas de alta gastronomia.',
        verified: true
      },
      {
        id: 'award-1',
        title: 'Prémio Chef Revelação Privado',
        issuer: 'Guia Gastronomia Portugal',
        year: '2023',
        type: 'award',
        description: 'Distinção para excelência em serviços de private dining e personal chef.',
        verified: true
      },
      {
        id: 'cert-2',
        title: 'Certificação Avançada HACCP & Segurança Alimentar',
        issuer: 'APCER Portugal',
        year: '2024',
        type: 'certification',
        description: 'Auditoria e certificação de normas internacionais de higiene e manuseamento alimentar.',
        verified: true
      }
    ],
    faqs: [
      {
        id: 'faq-1',
        question: 'Como lida com alergias alimentares ou intolerâncias severas?',
        answer: 'Trabalho com protocolo rigoroso de higienização de utensílios e preparação separada para contaminação cruzada (ex: celíacos, frutos do mar e lactose). Confirmo sempre todas as restrições com antecedência.',
        category: 'alergias'
      },
      {
        id: 'faq-2',
        question: 'Preciso de fornecer tachos, pratos ou utensílios na minha cozinha?',
        answer: 'Trago todo o meu equipamento profissional (facas de precisão, pequenos eletrodomésticos e utensílios específicos). Apenas utilizo a sua bancada, fogão, forno e a louça de serviço para empratamento.',
        category: 'logistica'
      },
      {
        id: 'faq-3',
        question: 'A cozinha fica limpa no final do serviço?',
        answer: 'Absolutamente! No final do evento, limpo e higienizo a bancada, área de trabalho e lavo todos os utensílios utilizados, deixando a sua cozinha impecável.',
        category: 'logistica'
      },
      {
        id: 'faq-4',
        question: 'De onde vêm os ingredientes utilizados nos menus?',
        answer: 'Compro 100% dos ingredientes no próprio dia do evento em mercados locais de produtores e peixarias da região de Lisboa, garantindo máxima frescura e sustentabilidade.',
        category: 'ingredientes'
      }
    ]
  },
  { 
    id: UUID_CHEF_RICARDO, 
    nome: 'Chef Ricardo Sousa', 
    email: 'ricardo@chef.com', 
    telefone: '961122334', 
    role: UserRole.COOK, 
    status: UserStatus.ACTIVE, 
    created_at: '2024-03-01',
    // Fix: Using is_chef instead of isChef to match User interface
    is_chef: true,
    isAvailable: true,
    nif: '987654321',
    biografia: 'Especialista em cozinha tradicional Portuguesa com um toque moderno.',
    especialidades: ['Portuguesa', 'Sobremesas'],
    precoMedio: 35,
    localizacao: 'Porto',
    rating: 4.5,
    total_reservas: 5,
    approvedByAdmin: true,
    certifications_and_awards: [
      {
        id: 'cert-ricardo-1',
        title: 'Curso Superior de Artes Culinárias',
        issuer: 'Escola de Hotelaria e Turismo do Porto',
        year: '2020',
        type: 'training',
        description: 'Formação focada na valorização dos produtos tradicionais portugueses e alta pastelaria.',
        verified: true
      }
    ]
  }
];

export const mockMenus: Record<string, MenuItem[]> = {
  [UUID_CHEF_MARIA]: [
    // Fix: Added missing 'type' property to match MenuItem interface
    { id: UUID_MENU_1, cookId: UUID_CHEF_MARIA, nome: 'Menu Degustação Mar', descricao: 'Tártaro de atum e arroz de lagosta.', preco: 55, type: 'experience', imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800' }
  ],
  [UUID_CHEF_RICARDO]: [
    // Fix: Added missing 'type' property to match MenuItem interface
    { id: UUID_MENU_2, cookId: UUID_CHEF_RICARDO, nome: 'Bacalhau Moderno', descricao: 'Lombo confitado com crosta de broa.', preco: 30, type: 'dish', imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db06?q=80&w=800' }
  ]
};

export const mockRecipes: Record<string, ChefRecipe[]> = {
  [UUID_CHEF_MARIA]: [
    // Added missing required property 'preco' to match the ChefRecipe interface
    { id: UUID_RECIPE_1, cookId: UUID_CHEF_MARIA, nome: 'Risotto de Cogumelos', descricao: 'Cremoso com trufa negra.', imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&get=80&w=400', isPopular: true, preco: 25 }
  ]
};

export const mockBookings: Booking[] = [
  {
    id: UUID_BOOKING_1,
    clientId: UUID_CLIENT,
    cookId: UUID_CHEF_MARIA,
    clientName: 'João Silva',
    cookName: 'Chef Maria Garcia',
    data: '2024-06-10',
    hora: '20:00',
    morada: 'Rua de Santa Catarina, 450, Porto',
    numPessoas: 4,
    valorTotal: 180,
    status: BookingStatus.ACCEPTED,
    menu_selected: 'Menu Degustação Mar',
    createdAt: '2024-03-28T10:00:00Z',
    restrictions: ['Frutos Secos'],
    kitchenNotes: 'Placa de indução disponível.'
  }
];
