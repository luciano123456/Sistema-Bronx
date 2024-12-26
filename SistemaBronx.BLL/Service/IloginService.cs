using SistemaBronx.Models;
using System.Net.Http;

namespace SistemaBronx.BLL.Service
{
    public interface ILoginService
    {
        Task<User> Login(string username, string password);

        Task<bool> Logout();
    }
}
