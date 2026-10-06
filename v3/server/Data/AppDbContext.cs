using Microsoft.EntityFrameworkCore;

namespace GameServer.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var user = modelBuilder.Entity<User>();
        user.Property(u => u.Username).HasMaxLength(20).UseCollation("NOCASE");
        user.HasIndex(u => u.Username).IsUnique();
    }
}
