const logger = require('../../utils/logger');
const AIModel = require('../models/aiModel');

class AIService {
  static generateResponse(prompt, context = []) {
    
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('create database') || promptLower.includes('database for')) {
      return this.generateDatabaseStructure(prompt);
    }
    
    if (promptLower.includes('query') || promptLower.includes('find') || promptLower.includes('get') || promptLower.includes('show me')) {
      return this.generateDatabaseQuery(prompt);
    }
    
    if (promptLower.includes('update') || promptLower.includes('change') || promptLower.includes('modify')) {
      return this.generateDatabaseUpdate(prompt);
    }
    
    if (promptLower.includes('analyze') || promptLower.includes('optimize') || promptLower.includes('improve')) {
      return this.analyzeDatabaseStructure(prompt);
    }
    
    return {
      type: 'text',
      content: `I'm your Instantiate.dev AI assistant. I can help you with:
1. Creating database structures from descriptions
2. Generating queries from natural language
3. Creating updates from descriptions
4. Analyzing your database structure
5. Answering questions about Instantiate.dev

What would you like help with today?`
    };
  }
  
  static generateDatabaseStructure(prompt) {
    const entities = this.extractEntities(prompt);
    
    const structure = {};
    
    entities.forEach(entity => {
      structure[entity.name] = {
        __doc: `Collection for ${entity.name}`,
        __example: this.generateExampleDocument(entity)
      };
      
      if (entity.relationships && entity.relationships.length > 0) {
        entity.relationships.forEach(rel => {
          const relName = `${entity.name}-${rel.target}`;
          structure[relName] = {
            __doc: `Relationship between ${entity.name} and ${rel.target}`,
            __example: {
              [`${entity.name}Id`]: `${entity.name}1`,
              [`${rel.target}Id`]: `${rel.target}1`,
              createdAt: Date.now()
            }
          };
        });
      }
    });
    
    return {
      type: 'database-structure',
      content: structure,
      code: `// Initialize your database with this structure
const instantiate = new InstantiateSDK({
  apiUrl: 'http://localhost:3000/api'
});

${entities.map(entity => `
await instantiate.ref('/${entity.name}').set({
});`).join('\n')}

${entities.map(entity => `
const ${entity.name}Id = 'id-' + Date.now();
await instantiate.ref('/${entity.name}/' + ${entity.name}Id).set(${JSON.stringify(this.generateExampleDocument(entity), null, 2)});`).join('\n')}
`
    };
  }
  
  static generateDatabaseQuery(prompt) {
    const params = this.extractQueryParams(prompt);
    
    return {
      type: 'database-query',
      content: params,
      code: `// Query generated from: "${prompt}"
const instantiate = new InstantiateSDK({
  apiUrl: 'http://localhost:3000/api'
});

async function executeQuery() {
  try {
    ${params.collection ? `// Get data from ${params.collection}
    const snapshot = await instantiate.ref('/${params.collection}')${params.filter ? `.orderByChild('${params.filter.field}')` : ''}.get();
    
    if (!snapshot) {
      console.log('No data found');
      return [];
    }
    
    const results = Object.entries(snapshot).map(([id, data]) => ({
      id,
      ...data
    }));
    
    ${params.filter ? `// Apply filters
    const filtered = results.filter(item => item.${params.filter.field} ${params.filter.operator} ${JSON.stringify(params.filter.value)});` : ''}
    
    ${params.sort ? `// Sort results
    const sorted = ${params.filter ? 'filtered' : 'results'}.sort((a, b) => ${params.sort.direction === 'asc' ? 'a' : 'b'}.${params.sort.field} - ${params.sort.direction === 'asc' ? 'b' : 'a'}.${params.sort.field});` : ''}
    
    ${params.limit ? `// Limit results
    const limited = ${params.sort ? 'sorted' : params.filter ? 'filtered' : 'results'}.slice(0, ${params.limit});` : ''}
    
    return ${params.limit ? 'limited' : params.sort ? 'sorted' : params.filter ? 'filtered' : 'results'};` : `// No collection specified
    console.log('Please specify a collection to query');
    return [];`}
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

executeQuery()
  .then(results => {
    console.log('Query results:', results);
  })
  .catch(error => {
    console.error('Query failed:', error);
  });
`
    };
  }
  
  static generateDatabaseUpdate(prompt) {
    const params = this.extractUpdateParams(prompt);
    
    return {
      type: 'database-update',
      content: params,
      code: `// Update generated from: "${prompt}"
const instantiate = new InstantiateSDK({
  apiUrl: 'http://localhost:3000/api'
});

async function executeUpdate() {
  try {
    ${params.collection && params.id ? `// Update document in ${params.collection}
    await instantiate.ref('/${params.collection}/${params.id}').update(${JSON.stringify(params.updates, null, 2)});
    
    console.log('Update successful');` : `// No collection or ID specified
    console.log('Please specify a collection and ID to update');`}
  } catch (error) {
    console.error('Error executing update:', error);
    throw error;
  }
}

executeUpdate()
  .catch(error => {
    console.error('Update failed:', error);
  });
`
    };
  }
  
  static analyzeDatabaseStructure(prompt) {
    
    return {
      type: 'database-analysis',
      content: {
        collections: 3,
        documents: 120,
        size: '1.2 MB',
        issues: [
          {
            type: 'performance',
            description: 'Consider adding an index on frequently queried fields',
            recommendation: 'Add indexes on user.email and posts.publishedAt'
          },
          {
            type: 'structure',
            description: 'Nested data structure may cause performance issues',
            recommendation: 'Consider denormalizing deeply nested data'
          }
        ],
        recommendations: [
          'Use compound indexes for complex queries',
          'Implement pagination for large collections',
          'Consider caching frequently accessed data'
        ]
      },
      code: `// Database structure analysis
/*
Analysis Summary:
- Collections: 3
- Documents: 120
- Size: 1.2 MB

Issues:
1. Performance: Consider adding an index on frequently queried fields
   Recommendation: Add indexes on user.email and posts.publishedAt

2. Structure: Nested data structure may cause performance issues
   Recommendation: Consider denormalizing deeply nested data

Recommendations:
- Use compound indexes for complex queries
- Implement pagination for large collections
- Consider caching frequently accessed data
*/

const instantiate = new InstantiateSDK({
  apiUrl: 'http://localhost:3000/api'
});

async function implementRecommendations() {
  try {
    console.log('Adding indexes...');
    
    const pageSize = 10;
    const page = 1;
    
    const startAt = (page - 1) * pageSize;
    const endAt = page * pageSize;
    
    const results = await instantiate.ref('/posts')
      .orderByChild('publishedAt')
      .limitToLast(pageSize)
      .get();
    
    console.log('Paginated results:', results);
  } catch (error) {
    console.error('Error implementing recommendations:', error);
  }
}
`
    };
  }
  
  static extractEntities(prompt) {
    
    const entities = [];
    
    if (prompt.toLowerCase().includes('user') || prompt.toLowerCase().includes('users')) {
      entities.push({
        name: 'users',
        fields: ['name', 'email', 'createdAt'],
        relationships: [
          { type: 'hasMany', target: 'posts' }
        ]
      });
    }
    
    if (prompt.toLowerCase().includes('post') || prompt.toLowerCase().includes('posts') || prompt.toLowerCase().includes('blog')) {
      entities.push({
        name: 'posts',
        fields: ['title', 'content', 'authorId', 'publishedAt'],
        relationships: [
          { type: 'belongsTo', target: 'users' },
          { type: 'hasMany', target: 'comments' }
        ]
      });
    }
    
    if (prompt.toLowerCase().includes('comment') || prompt.toLowerCase().includes('comments')) {
      entities.push({
        name: 'comments',
        fields: ['content', 'authorId', 'postId', 'createdAt'],
        relationships: [
          { type: 'belongsTo', target: 'users' },
          { type: 'belongsTo', target: 'posts' }
        ]
      });
    }
    
    if (entities.length === 0) {
      entities.push({
        name: 'items',
        fields: ['name', 'description', 'createdAt'],
        relationships: []
      });
    }
    
    return entities;
  }
  
  static generateExampleDocument(entity) {
    const doc = {};
    
    entity.fields.forEach(field => {
      if (field === 'name') {
        doc[field] = 'John Doe';
      } else if (field === 'email') {
        doc[field] = 'john@example.com';
      } else if (field === 'title') {
        doc[field] = 'My First Post';
      } else if (field === 'content') {
        doc[field] = 'This is the content of my first post.';
      } else if (field === 'authorId') {
        doc[field] = 'user1';
      } else if (field === 'postId') {
        doc[field] = 'post1';
      } else if (field === 'publishedAt' || field === 'createdAt') {
        doc[field] = Date.now();
      } else if (field === 'description') {
        doc[field] = 'This is a description.';
      }
    });
    
    return doc;
  }
  
  static extractQueryParams(prompt) {
    
    const params = {
      collection: null,
      filter: null,
      sort: null,
      limit: null
    };
    
    if (prompt.toLowerCase().includes('user') || prompt.toLowerCase().includes('users')) {
      params.collection = 'users';
    } else if (prompt.toLowerCase().includes('post') || prompt.toLowerCase().includes('posts')) {
      params.collection = 'posts';
    } else if (prompt.toLowerCase().includes('comment') || prompt.toLowerCase().includes('comments')) {
      params.collection = 'comments';
    }
    
    if (prompt.toLowerCase().includes('where') || prompt.toLowerCase().includes('with')) {
      if (params.collection === 'users' && prompt.toLowerCase().includes('email')) {
        params.filter = {
          field: 'email',
          operator: '===',
          value: 'john@example.com'
        };
      } else if (params.collection === 'posts') {
        if (prompt.toLowerCase().includes('author')) {
          params.filter = {
            field: 'authorId',
            operator: '===',
            value: 'user1'
          };
        } else {
          params.filter = {
            field: 'publishedAt',
            operator: '>',
            value: Date.now() - 86400000 // 1 day ago
          };
        }
      } else if (params.collection === 'comments') {
        params.filter = {
          field: 'postId',
          operator: '===',
          value: 'post1'
        };
      }
    }
    
    if (prompt.toLowerCase().includes('sort') || prompt.toLowerCase().includes('order')) {
      if (params.collection === 'users') {
        params.sort = {
          field: 'name',
          direction: 'asc'
        };
      } else if (params.collection === 'posts') {
        params.sort = {
          field: 'publishedAt',
          direction: prompt.toLowerCase().includes('asc') ? 'asc' : 'desc'
        };
      } else if (params.collection === 'comments') {
        params.sort = {
          field: 'createdAt',
          direction: 'desc'
        };
      }
    }
    
    if (prompt.toLowerCase().includes('limit') || prompt.toLowerCase().includes('top')) {
      const limitMatch = prompt.match(/\b(\d+)\b/);
      if (limitMatch) {
        params.limit = parseInt(limitMatch[1], 10);
      } else {
        params.limit = 10; // Default limit
      }
    }
    
    return params;
  }
  
  static extractUpdateParams(prompt) {
    
    const params = {
      collection: null,
      id: null,
      updates: {}
    };
    
    if (prompt.toLowerCase().includes('user') || prompt.toLowerCase().includes('users')) {
      params.collection = 'users';
      params.id = 'user1';
      
      if (prompt.toLowerCase().includes('name')) {
        params.updates.name = 'Jane Smith';
      }
      if (prompt.toLowerCase().includes('email')) {
        params.updates.email = 'jane@example.com';
      }
      if (prompt.toLowerCase().includes('bio')) {
        params.updates.bio = 'Professional blogger';
      }
    } else if (prompt.toLowerCase().includes('post') || prompt.toLowerCase().includes('posts')) {
      params.collection = 'posts';
      params.id = 'post1';
      
      if (prompt.toLowerCase().includes('title')) {
        params.updates.title = 'Updated Post Title';
      }
      if (prompt.toLowerCase().includes('content')) {
        params.updates.content = 'This is the updated content of my post.';
      }
      if (prompt.toLowerCase().includes('publish')) {
        params.updates.published = true;
        params.updates.publishedAt = Date.now();
      }
    } else if (prompt.toLowerCase().includes('comment') || prompt.toLowerCase().includes('comments')) {
      params.collection = 'comments';
      params.id = 'comment1';
      
      if (prompt.toLowerCase().includes('content')) {
        params.updates.content = 'This is my updated comment.';
      }
    }
    
    return params;
  }
  
  static async createConversation(userId) {
    return AIModel.createConversation(userId);
  }
  
  static async getConversation(conversationId) {
    return AIModel.getConversation(conversationId);
  }
  
  static async addUserMessage(conversationId, message) {
    return AIModel.addMessage(conversationId, message, true);
  }
  
  static async addAIResponse(conversationId, message) {
    return AIModel.addMessage(conversationId, message, false);
  }
  
  static async processMessage(conversationId, message) {
    try {
      const conversation = await this.addUserMessage(conversationId, message);
      
      const response = this.generateResponse(message, conversation.messages);
      
      await this.addAIResponse(conversationId, JSON.stringify(response));
      
      return response;
    } catch (error) {
      logger.error(`Error processing AI message: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AIService;
