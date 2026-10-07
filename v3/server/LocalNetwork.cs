using System.Net;
using System.Net.NetworkInformation;

namespace GameServer;

public static class LocalNetwork
{
    // True when the game page was served from this machine: localhost, or one of this machine's
    // network addresses (how LAN players open it, e.g. http://192.168.1.20:5173).
    public static bool IsLocalOrigin(string origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        {
            return false;
        }
        if (uri.IsLoopback)
        {
            return true;
        }
        return IPAddress.TryParse(uri.Host, out var ip) && MachineAddresses().Contains(ip);
    }

    // Read each time so a changed Wi-Fi address still works without restarting.
    private static HashSet<IPAddress> MachineAddresses() =>
        NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .Select(a => a.Address)
            .ToHashSet();
}
