using Microsoft.PowerPlatform.Dataverse.Client;

namespace bar_system_backend.Services
{
    public class DataverseServices
    {
        private readonly ServiceClient _serviceClient;

        public DataverseServices(IConfiguration configuration)
        {
            var dataverseUrl = configuration["Dataverse:Url"];
            var dataverseClientId = configuration["Dataverse:ClientId"];
            var dataverseClientSecret = configuration["Dataverse:ClientSecret"];

            if (string.IsNullOrEmpty(dataverseUrl) ||
                string.IsNullOrEmpty(dataverseClientId) ||
                string.IsNullOrEmpty(dataverseClientSecret))
            {
                throw new ArgumentException("Dataverse configuration is missing or invalid.");
            }

            var connectionString = $"AuthType=ClientSecret;Url={dataverseUrl};ClientId={dataverseClientId};ClientSecret={dataverseClientSecret};";
            _serviceClient = new ServiceClient(connectionString);

            if (!_serviceClient.IsReady)
            {
                throw new InvalidOperationException("Failed to connect to Dataverse. Please check your configuration.");
            }
        }
        public ServiceClient Client => _serviceClient;
    }
}