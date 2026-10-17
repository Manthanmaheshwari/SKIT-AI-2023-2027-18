using Microsoft.AspNetCore.Authorization;

namespace EnterpriseApi.Infrastructure.Authorization.Requirements;

/// <summary>
/// Authorization requirement that evaluates whether the authenticated subject's JWT Role claim(s)
/// satisfy the strict classification level boundaries required to access a document resource.
/// </summary>
public class DocumentClassificationRequirement : IAuthorizationRequirement
{
    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentClassificationRequirement"/> class.
    /// </summary>
    public DocumentClassificationRequirement()
    {
    }
}
