exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('investor_partners', 'photo_url');
  if (!hasCol) {
    await knex.schema.alterTable('investor_partners', (t) => {
      t.text('photo_url').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('investor_partners', 'photo_url');
  if (hasCol) {
    await knex.schema.alterTable('investor_partners', (t) => {
      t.dropColumn('photo_url');
    });
  }
};
